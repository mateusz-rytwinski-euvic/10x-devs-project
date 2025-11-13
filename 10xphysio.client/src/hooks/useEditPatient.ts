import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { updatePatient } from '../services/patientService';
import type {
    EditPatientFormState,
    PatientDetailsDto,
    PatientUpdateCommand,
    UseEditPatientResult,
    ValidationErrors,
} from '../types/patientDetails';
import { useAuth } from './useAuth';

interface UseEditPatientOptions {
    patientId: string;
    etag: string;
    initialState: EditPatientFormState;
    onSuccess?: (payload: PatientDetailsDto) => void;
    onConflict?: () => void;
    onNotFound?: () => void;
    onUnauthorized?: () => void;
    onError?: (message: string) => void;
}

interface PatientUpdateError extends Error {
    status?: number;
    validationErrors?: ValidationErrors;
}

const MAX_NAME_LENGTH = 100;

/**
 * validateFormState validates the demographics form state and returns field level errors.
 */
const validateFormState = (state: EditPatientFormState): ValidationErrors => {
    const errors: ValidationErrors = {};

    const firstName = state.firstName?.trim();
    const lastName = state.lastName?.trim();

    if (!firstName) {
        errors.firstName = 'Imię jest wymagane.';
    } else if (firstName.length > MAX_NAME_LENGTH) {
        errors.firstName = `Imię nie może zawierać więcej niż ${MAX_NAME_LENGTH} znaków.`;
    }

    if (!lastName) {
        errors.lastName = 'Nazwisko jest wymagane.';
    } else if (lastName.length > MAX_NAME_LENGTH) {
        errors.lastName = `Nazwisko nie może zawierać więcej niż ${MAX_NAME_LENGTH} znaków.`;
    }

    if (state.dateOfBirth) {
        const parsed = new Date(state.dateOfBirth);

        if (Number.isNaN(parsed.getTime())) {
            errors.dateOfBirth = 'Podana data urodzenia jest nieprawidłowa.';
        } else if (parsed > new Date()) {
            errors.dateOfBirth = 'Data urodzenia nie może wskazywać przyszłości.';
        }
    }

    return errors;
};

const mapFormStateToCommand = (state: EditPatientFormState): PatientUpdateCommand => ({
    firstName: state.firstName.trim(),
    lastName: state.lastName.trim(),
    dateOfBirth: state.dateOfBirth?.trim() ? state.dateOfBirth : undefined,
});

/**
 * useEditPatient orchestrates the patient demographics edit flow, leveraging React Query for mutation handling
 * and encapsulating optimistic UI state together with validation and concurrency (ETag) awareness.
 */
export const useEditPatient = ({
    patientId,
    etag,
    initialState,
    onSuccess,
    onConflict,
    onNotFound,
    onUnauthorized,
    onError,
}: UseEditPatientOptions): UseEditPatientResult => {
    const { session } = useAuth();
    const queryClient = useQueryClient();

    const [editing, setEditing] = useState<boolean>(false);
    const [formState, setFormState] = useState<EditPatientFormState>(initialState);
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [currentEtag, setCurrentEtag] = useState<string>(etag);

    useEffect(() => {
        setCurrentEtag(etag);
    }, [etag]);

    useEffect(() => {
        if (editing) {
            return;
        }

        setFormState(initialState);
    }, [editing, initialState]);

    const mutation = useMutation({
        mutationFn: async (command: PatientUpdateCommand) => {
            if (!session?.accessToken) {
                throw Object.assign(new Error('Brak tokenu autoryzacyjnego.'), { status: 401 });
            }

            return updatePatient({
                patientId,
                command,
                etag: currentEtag,
                token: session.accessToken,
            });
        },
        onSuccess: (payload) => {
            setErrors({});
            setEditing(false);
            setFormState({
                firstName: payload.firstName,
                lastName: payload.lastName,
                dateOfBirth: payload.dateOfBirth ?? null,
            });
            setCurrentEtag(payload.eTag);
            queryClient.invalidateQueries({ queryKey: ['patientDetails'] }).catch((error) => {
                console.error('Nie udało się odświeżyć danych pacjenta po aktualizacji.', error);
            });
            onSuccess?.(payload);
        },
        onError: (error: unknown) => {
            console.error('Aktualizacja danych pacjenta zakończyła się błędem.', error);

            const typedError = error as PatientUpdateError | undefined;
            const status = typedError?.status;

            if (status === 401) {
                onUnauthorized?.();
                return;
            }

            if (status === 404) {
                onNotFound?.();
                return;
            }

            if (status === 409 || status === 412) {
                onConflict?.();
                return;
            }

            if (status === 400 || status === 422) {
                const fieldErrors = typedError?.validationErrors ?? {};
                setErrors((previous) => ({
                    ...previous,
                    ...fieldErrors,
                }));
                return;
            }

            onError?.(
                typedError?.message ?? 'Nie udało się zapisać zmian pacjenta. Spróbuj ponownie lub skontaktuj się z pomocą.',
            );
        },
    });

    const start = useCallback(() => {
        if (editing) {
            return;
        }

        setErrors({});
        setFormState(initialState);
        setEditing(true);
    }, [editing, initialState]);

    const cancel = useCallback(() => {
        setEditing(false);
        setErrors({});
        setFormState(initialState);
    }, [initialState]);

    const setFieldValue = useCallback<UseEditPatientResult['setFieldValue']>((field, value) => {
        setFormState((previous) => ({
            ...previous,
            [field]: value,
        }));
        setErrors((previous) => ({
            ...previous,
            [field]: undefined,
        }));
    }, []);

    const resetErrors = useCallback(() => {
        setErrors({});
    }, []);

    const submit = useCallback<UseEditPatientResult['submit']>(
        async (commandOverride) => {
            if (!editing) {
                return;
            }

            const stateToValidate = commandOverride
                ? {
                    firstName: commandOverride.firstName,
                    lastName: commandOverride.lastName,
                    dateOfBirth: commandOverride.dateOfBirth ?? null,
                }
                : formState;

            const validationResult = validateFormState(stateToValidate);

            if (Object.keys(validationResult).length > 0) {
                setErrors(validationResult);
                return;
            }

            const command = commandOverride ?? mapFormStateToCommand(formState);

            await mutation.mutateAsync(command);
        },
        [editing, formState, mutation],
    );

    return useMemo<UseEditPatientResult>(() => ({
        editing,
        start,
        cancel,
        submit,
        isSaving: mutation.isPending,
        errors,
        formState,
        setFieldValue,
        resetErrors,
    }), [cancel, editing, errors, formState, mutation.isPending, resetErrors, setFieldValue, start, submit]);
};
