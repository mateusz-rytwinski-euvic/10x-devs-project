import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPatient, getPatientDetails, PatientsEndpointError, updatePatient } from '../services/patientService';
import type { PatientCreateCommand, PatientDetailsDto, PatientUpdateCommand, ValidationErrors } from '../types/patientDetails';
import type { PatientFormData, PatientFormErrors, PatientFormViewModel } from '../types/patientForm';
import { getPatientDetailsPath } from '../routes';
import { isValidGuid } from '../utils/guid';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

const MAX_NAME_LENGTH = 100;
const VALIDATION_ERROR_MESSAGE = 'Nie udało się zapisać zmian. Sprawdź oznaczone pola formularza.';

const buildInitialFormData = (overrides?: Partial<PatientFormData>): PatientFormData => ({
    firstName: overrides?.firstName ?? '',
    lastName: overrides?.lastName ?? '',
    dateOfBirth: overrides?.dateOfBirth ?? null,
});

const toDateInputValue = (value: string | null | undefined): string | null => {
    if (!value) {
        return null;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
        return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed.toISOString().slice(0, 10);
};

const sanitizeDateForCommand = (value: string | null | undefined): string | null => {
    if (!value) {
        return null;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
        return null;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed.toISOString().slice(0, 10);
};

const mapValidationErrors = (source?: ValidationErrors | null): PatientFormErrors => {
    if (!source) {
        return {};
    }

    const mapped: PatientFormErrors = {};

    if (source.firstName) {
        mapped.firstName = source.firstName;
    }

    if (source.lastName) {
        mapped.lastName = source.lastName;
    }

    if (source.dateOfBirth) {
        mapped.dateOfBirth = source.dateOfBirth;
    }

    if (source.general) {
        mapped.general = source.general;
    }

    return mapped;
};

const formatError = (candidate: unknown): Error => {
    if (candidate instanceof Error) {
        return candidate;
    }

    if (typeof candidate === 'string') {
        return new Error(candidate);
    }

    return new Error('Wystąpił nieoczekiwany błąd. Spróbuj ponownie.');
};

const isFutureDate = (value: string): boolean => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    parsed.setHours(0, 0, 0, 0);

    return parsed > today;
};

const validateFormState = (state: PatientFormData): PatientFormErrors => {
    const errors: PatientFormErrors = {};

    const firstName = state.firstName.trim();
    const lastName = state.lastName.trim();

    if (firstName.length === 0) {
        errors.firstName = 'Imię jest wymagane.';
    } else if (firstName.length > MAX_NAME_LENGTH) {
        errors.firstName = `Imię nie może zawierać więcej niż ${MAX_NAME_LENGTH} znaków.`;
    }

    if (lastName.length === 0) {
        errors.lastName = 'Nazwisko jest wymagane.';
    } else if (lastName.length > MAX_NAME_LENGTH) {
        errors.lastName = `Nazwisko nie może zawierać więcej niż ${MAX_NAME_LENGTH} znaków.`;
    }

    if (state.dateOfBirth) {
        const sanitized = sanitizeDateForCommand(state.dateOfBirth);
        if (!sanitized) {
            errors.dateOfBirth = 'Data urodzenia ma nieprawidłowy format.';
        } else if (isFutureDate(sanitized)) {
            errors.dateOfBirth = 'Data urodzenia nie może wskazywać przyszłości.';
        }
    }

    return errors;
};

const buildCreateCommand = (formData: PatientFormData): PatientCreateCommand => ({
    firstName: formData.firstName.trim(),
    lastName: formData.lastName.trim(),
    dateOfBirth: sanitizeDateForCommand(formData.dateOfBirth) ?? undefined,
});

const buildUpdateCommand = (formData: PatientFormData): PatientUpdateCommand => ({
    firstName: formData.firstName.trim(),
    lastName: formData.lastName.trim(),
    dateOfBirth: sanitizeDateForCommand(formData.dateOfBirth) ?? undefined,
});

const mapDtoToFormData = (dto: PatientDetailsDto): PatientFormData =>
    buildInitialFormData({
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: toDateInputValue(dto.dateOfBirth ?? null),
    });

/**
 * usePatientFormViewModel orchestrates patient create/edit flows mirroring the visit form architecture.
 */
export const usePatientFormViewModel = (patientId?: string | null): PatientFormViewModel => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { session } = useAuth();
    const { pushToast } = useToast();

    const accessToken = session?.accessToken ?? null;
    const hasValidPatientId = Boolean(patientId && isValidGuid(patientId));
    const isEditMode = hasValidPatientId;

    const [formData, setFormData] = useState<PatientFormData>(() => buildInitialFormData());
    const [formErrors, setFormErrors] = useState<PatientFormErrors>({});
    const [error, setError] = useState<Error | null>(null);
    const [etag, setEtag] = useState<string | null>(null);
    const [resolvedPatientId, setResolvedPatientId] = useState<string | null>(hasValidPatientId ? patientId ?? null : null);

    useEffect(() => {
        if (!hasValidPatientId || !patientId) {
            return;
        }

        setResolvedPatientId(patientId);
    }, [hasValidPatientId, patientId]);

    const patientQuery = useQuery({
        queryKey: ['patientForm', patientId, accessToken],
        enabled: Boolean(accessToken) && isEditMode,
        staleTime: 15_000,
        retry: (failureCount, err) => {
            if (err instanceof PatientsEndpointError && err.status === 404) {
                return false;
            }

            return failureCount < 2;
        },
        queryFn: async () => {
            if (!patientId || !accessToken) {
                throw new PatientsEndpointError('Brak danych pacjenta.', 400);
            }

            return getPatientDetails(patientId, { includeVisits: false }, accessToken);
        },
    });

    useEffect(() => {
        if (!patientQuery.data) {
            return;
        }

        const dto = patientQuery.data;
        setFormData(mapDtoToFormData(dto));
        setEtag(dto.eTag);
        setResolvedPatientId(dto.id);
        setFormErrors({});
        setError(null);
    }, [patientQuery.data]);

    useEffect(() => {
        if (!patientQuery.error) {
            return;
        }

        const formatted = formatError(patientQuery.error);
        setError(formatted);
    }, [patientQuery.error]);

    const invalidatePatientQueries = useCallback(
        (scopePatientId?: string | null) => {
            queryClient.invalidateQueries({ queryKey: ['patients'], exact: false }).catch(() => undefined);
            if (scopePatientId) {
                queryClient.invalidateQueries({ queryKey: ['patientDetails', scopePatientId], exact: false }).catch(() => undefined);
            }
            queryClient.invalidateQueries({ queryKey: ['patientForm'], exact: false }).catch(() => undefined);
        },
        [queryClient],
    );

    const handleMutationError = useCallback(
        (mutationError: unknown) => {
            const formatted = formatError(mutationError);

            if (mutationError instanceof PatientsEndpointError) {
                setFormErrors(mapValidationErrors(mutationError.validationErrors));
            }

            setError(formatted);
            pushToast({ intent: 'error', text: formatted.message });
        },
        [pushToast],
    );

    const createPatientMutation = useMutation({
        mutationFn: async () => {
            if (!accessToken) {
                throw new PatientsEndpointError('Brak tokenu autoryzacyjnego.', 401);
            }

            const command: PatientCreateCommand = buildCreateCommand(formData);
            return createPatient({ command, token: accessToken });
        },
        onSuccess: (dto) => {
            invalidatePatientQueries(dto.id);
            pushToast({ intent: 'success', text: 'Pacjent został utworzony.' });
            setFormData(mapDtoToFormData(dto));
            setEtag(dto.eTag);
            setResolvedPatientId(dto.id);
            setFormErrors({});
            setError(null);
            navigate(getPatientDetailsPath(dto.id), { replace: true });
        },
        onError: handleMutationError,
    });

    const updatePatientMutation = useMutation({
        mutationFn: async () => {
            if (!accessToken || !resolvedPatientId) {
                throw new PatientsEndpointError('Brak danych pacjenta.', 400);
            }

            if (!etag) {
                throw new PatientsEndpointError('Brak etykiety wersji danych pacjenta (ETag).', 428);
            }

            const command: PatientUpdateCommand = buildUpdateCommand(formData);
            return updatePatient({ patientId: resolvedPatientId, command, token: accessToken, etag });
        },
        onSuccess: (dto) => {
            invalidatePatientQueries(dto.id);
            pushToast({ intent: 'success', text: 'Zmiany pacjenta zostały zapisane.' });
            setFormData(mapDtoToFormData(dto));
            setEtag(dto.eTag);
            setResolvedPatientId(dto.id);
            setFormErrors({});
            setError(null);
        },
        onError: handleMutationError,
    });

    const setFormField = useCallback(<TKey extends keyof PatientFormData>(field: TKey, value: PatientFormData[TKey]) => {
        setFormData((previous) => ({
            ...previous,
            [field]: value,
        }));
        setFormErrors((previous) => ({
            ...previous,
            [field]: undefined,
            general: undefined,
        }));
        setError(null);
    }, []);

    const resetErrors = useCallback(() => {
        setFormErrors({});
        setError(null);
    }, []);

    const handleSavePatient = useCallback(async () => {
        const validationResult = validateFormState(formData);

        if (Object.keys(validationResult).length > 0) {
            setFormErrors(validationResult);
            const validationError = new Error(VALIDATION_ERROR_MESSAGE);
            setError(validationError);
            pushToast({ intent: 'error', text: validationError.message });
            return;
        }

        resetErrors();

        if (isEditMode) {
            await updatePatientMutation.mutateAsync();
            return;
        }

        await createPatientMutation.mutateAsync();
    }, [createPatientMutation, formData, isEditMode, pushToast, resetErrors, updatePatientMutation]);

    const isLoading = patientQuery.isLoading;
    const isSaving = createPatientMutation.isPending || updatePatientMutation.isPending;

    return useMemo<PatientFormViewModel>(
        () => ({
            formData,
            formErrors,
            isEditMode,
            isLoading,
            isSaving,
            error,
            etag,
            patientId: resolvedPatientId,
            setFormField,
            handleSavePatient,
            handleDeletePatient: null,
            resetErrors,
        }),
        [error, etag, formData, formErrors, handleSavePatient, isEditMode, isLoading, isSaving, resetErrors, resolvedPatientId, setFormField],
    );
};
