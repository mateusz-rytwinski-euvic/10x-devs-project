import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPatientDetailsPath, getPatientVisitDetailsPath, routes } from '../routes';
import { createVisit, deleteVisit, generateVisitRecommendations, getVisit, saveVisitRecommendations, updateVisit, VisitsEndpointError } from '../services/visitService';
import type { VisitAiGenerationCommand, VisitFormData, VisitFormViewModel, VisitRecommendationCommand } from '../types/visit';
import { isValidGuid } from '../utils/guid';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

const MIN_DESCRIPTION_LENGTH = 50;

const formatDateTimeForInput = (value: Date): string => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const normalizeVisitDateTime = (iso: string | null | undefined): string => {
    if (!iso) {
        return formatDateTimeForInput(new Date());
    }

    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) {
        return formatDateTimeForInput(new Date());
    }

    return formatDateTimeForInput(parsed);
};

const parseVisitDateTime = (value: string): Date | null => {
    if (!value || value.trim().length === 0) {
        return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed;
};

const buildInitialFormData = (overrides?: Partial<VisitFormData>): VisitFormData => ({
    visitDateTime: overrides?.visitDateTime ?? formatDateTimeForInput(new Date()),
    interview: overrides?.interview ?? '',
    description: overrides?.description ?? '',
    recommendations: overrides?.recommendations ?? '',
});

const toUtcIsoString = (value: string): string => {
    const parsed = parseVisitDateTime(value);

    if (!parsed) {
        throw new VisitsEndpointError('Wybierz prawidłową datę i godzinę wizyty.', 422);
    }

    return parsed.toISOString();
};

const buildGenerationCommand = (_description: string, regenerateFromGenerationId: string | null): VisitAiGenerationCommand => {
    const command: VisitAiGenerationCommand = {};

    if (regenerateFromGenerationId) {
        command.regenerateFromGenerationId = regenerateFromGenerationId;
    }

    return command;
};

const buildRecommendationCommand = (
    recommendations: string,
    sourceGenerationId: string | null,
): VisitRecommendationCommand => ({
    recommendations,
    aiGenerated: Boolean(sourceGenerationId),
    sourceGenerationId,
});

const formatError = (candidate: unknown): Error => {
    if (candidate instanceof Error) {
        return candidate;
    }

    if (typeof candidate === 'string') {
        return new Error(candidate);
    }

    return new Error('Wystąpił nieoczekiwany błąd. Spróbuj ponownie.');
};

/**
 * useVisitFormViewModel orchestrates data fetching, state, and mutations for the visit form page.
 */
export const useVisitFormViewModel = (patientId?: string | null, visitId?: string | null): VisitFormViewModel => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { session } = useAuth();
    const { pushToast } = useToast();

    const token = session?.accessToken ?? null;
    const hasValidPatientId = Boolean(patientId && isValidGuid(patientId));
    const hasValidVisitId = Boolean(visitId && isValidGuid(visitId));
    const isEditMode = hasValidVisitId;

    const [formData, setFormData] = useState<VisitFormData>(() => buildInitialFormData());
    const [resolvedPatientId, setResolvedPatientId] = useState<string | null>(hasValidPatientId ? patientId ?? null : null);
    const [etag, setEtag] = useState<string | null>(null);
    const [latestAiGenerationId, setLatestAiGenerationId] = useState<string | null>(null);
    const [recommendationsGeneratedByAi, setRecommendationsGeneratedByAi] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);

    const visitQuery = useQuery({
        queryKey: ['visitForm', visitId, token],
        enabled: isEditMode && Boolean(token),
        staleTime: 15_000,
        retry: (failureCount, err) => {
            if (err instanceof VisitsEndpointError && err.status === 404) {
                return false;
            }

            return failureCount < 2;
        },
        queryFn: async () => {
            if (!visitId || !token) {
                throw new VisitsEndpointError('Brak danych wizyty.', 400);
            }

            return getVisit(visitId, token);
        },
    });

    useEffect(() => {
        if (!hasValidPatientId || !patientId) {
            return;
        }

        setResolvedPatientId(patientId);
    }, [hasValidPatientId, patientId]);

    useEffect(() => {
        if (!visitQuery.data) {
            return;
        }

        const dto = visitQuery.data;

        setFormData(buildInitialFormData({
            visitDateTime: normalizeVisitDateTime(dto.visitDate),
            interview: dto.interview ?? '',
            description: dto.description ?? '',
            recommendations: dto.recommendations ?? '',
        }));

        setEtag(dto.eTag);
        setLatestAiGenerationId(dto.latestAiGenerationId ?? null);
        setRecommendationsGeneratedByAi(Boolean(dto.recommendationsGeneratedByAi));
        setResolvedPatientId(dto.patientId);
        setError(null);
    }, [visitQuery.data]);

    useEffect(() => {
        if (!visitQuery.error) {
            return;
        }

        setError(formatError(visitQuery.error));
    }, [visitQuery.error]);

    const invalidateVisitQueries = useCallback(() => {
        const scopePatientId = resolvedPatientId ?? (hasValidPatientId && patientId ? patientId : null);
        queryClient.invalidateQueries({ queryKey: ['visitDetails'], exact: false }).catch(() => undefined);
        queryClient.invalidateQueries({ queryKey: ['visitForm'], exact: false }).catch(() => undefined);
        if (scopePatientId) {
            queryClient.invalidateQueries({ queryKey: ['patientDetails', scopePatientId], exact: false }).catch(() => undefined);
            queryClient.invalidateQueries({ queryKey: ['patientVisits', scopePatientId], exact: false }).catch(() => undefined);
        }
    }, [hasValidPatientId, patientId, queryClient, resolvedPatientId]);

    const createVisitMutation = useMutation({
        mutationFn: async () => {
            if (!patientId || !token) {
                throw new VisitsEndpointError('Brak danych pacjenta.', 400);
            }

            const trimmedDescription = formData.description.trim();
            const trimmedRecommendations = formData.recommendations.trim();
            const trimmedInterview = formData.interview.trim();

            return createVisit(patientId, {
                visitDate: toUtcIsoString(formData.visitDateTime),
                description: trimmedDescription.length > 0 ? trimmedDescription : null,
                interview: trimmedInterview.length > 0 ? trimmedInterview : null,
                recommendations: trimmedRecommendations.length > 0 ? trimmedRecommendations : null,
            }, token);
        },
        onSuccess: (dto) => {
            invalidateVisitQueries();
            pushToast({ intent: 'success', text: 'Wizyta została utworzona.' });

            setFormData(buildInitialFormData({
                visitDateTime: normalizeVisitDateTime(dto.visitDate),
                interview: dto.interview ?? '',
                description: dto.description ?? '',
                recommendations: dto.recommendations ?? '',
            }));

            setEtag(dto.eTag);
            setLatestAiGenerationId(dto.latestAiGenerationId ?? null);
            setRecommendationsGeneratedByAi(Boolean(dto.recommendationsGeneratedByAi));
            setResolvedPatientId(dto.patientId);
            setError(null);

            navigate(getPatientVisitDetailsPath(dto.patientId, dto.id), { replace: true });
        },
        onError: (mutationError) => {
            const formatted = formatError(mutationError);
            setError(formatted);
            pushToast({ intent: 'error', text: formatted.message });
        },
    });

    const updateVisitMutation = useMutation({
        mutationFn: async () => {
            if (!visitId || !token) {
                throw new VisitsEndpointError('Brak danych wizyty.', 400);
            }

            if (!etag) {
                throw new VisitsEndpointError('Brak etykiety wersji danych wizyty (ETag).', 428);
            }

            const trimmedDescription = formData.description.trim();
            const trimmedInterview = formData.interview.trim();

            return updateVisit(visitId, {
                visitDate: toUtcIsoString(formData.visitDateTime),
                description: trimmedDescription.length > 0 ? trimmedDescription : null,
                interview: trimmedInterview.length > 0 ? trimmedInterview : null,
            }, token, etag);
        },
        onSuccess: (dto) => {
            invalidateVisitQueries();
            pushToast({ intent: 'success', text: 'Zmiany wizyty zostały zapisane.' });

            setFormData(buildInitialFormData({
                visitDateTime: normalizeVisitDateTime(dto.visitDate),
                interview: dto.interview ?? '',
                description: dto.description ?? '',
                recommendations: dto.recommendations ?? '',
            }));

            setEtag(dto.eTag);
            setLatestAiGenerationId(dto.latestAiGenerationId ?? null);
            setRecommendationsGeneratedByAi(Boolean(dto.recommendationsGeneratedByAi));
            setResolvedPatientId(dto.patientId);
            setError(null);
        },
        onError: (mutationError) => {
            const formatted = formatError(mutationError);
            setError(formatted);
            pushToast({ intent: 'error', text: formatted.message });
        },
    });

    const generateRecommendationsMutation = useMutation({
        mutationFn: async () => {
            if (!visitId || !token) {
                throw new VisitsEndpointError('Brak danych wizyty.', 400);
            }

            const command: VisitAiGenerationCommand = buildGenerationCommand(formData.description, latestAiGenerationId);
            return generateVisitRecommendations(visitId, command, token);
        },
        onSuccess: (generation) => {
            const candidate = generation.recommendationsPreview.trim().length > 0
                ? generation.recommendationsPreview
                : generation.aiResponse;

            setFormData((previous) => ({
                ...previous,
                recommendations: candidate,
            }));

            setLatestAiGenerationId(generation.generationId);
            setRecommendationsGeneratedByAi(true);
            setError(null);
            pushToast({ intent: 'success', text: 'Wygenerowano nowe zalecenia AI.' });
        },
        onError: (mutationError) => {
            const formatted = formatError(mutationError);
            setError(formatted);
            pushToast({ intent: 'error', text: formatted.message });
        },
    });

    const saveRecommendationsMutation = useMutation({
        mutationFn: async () => {
            if (!visitId || !token) {
                throw new VisitsEndpointError('Brak danych wizyty.', 400);
            }

            if (!etag) {
                throw new VisitsEndpointError('Brak etykiety wersji danych wizyty (ETag).', 428);
            }

            const trimmed = formData.recommendations.trim();

            const command: VisitRecommendationCommand = buildRecommendationCommand(trimmed, latestAiGenerationId);
            return saveVisitRecommendations(visitId, command, token, etag);
        },
        onSuccess: (state) => {
            invalidateVisitQueries();
            pushToast({ intent: 'success', text: 'Zalecenia zostały zapisane.' });

            setFormData((previous) => ({
                ...previous,
                recommendations: state.recommendations,
            }));

            setEtag(state.eTag);
            setRecommendationsGeneratedByAi(state.recommendationsGeneratedByAi);
            setError(null);
        },
        onError: (mutationError) => {
            const formatted = formatError(mutationError);
            setError(formatted);
            pushToast({ intent: 'error', text: formatted.message });
        },
    });

    const deleteVisitMutation = useMutation({
        mutationFn: async () => {
            if (!visitId || !token) {
                throw new VisitsEndpointError('Brak danych wizyty.', 400);
            }

            return deleteVisit(visitId, token);
        },
        onSuccess: () => {
            invalidateVisitQueries();
            pushToast({ intent: 'success', text: 'Wizyta została usunięta.' });

            const scopePatientId = resolvedPatientId ?? (hasValidPatientId && patientId ? patientId : null);
            if (scopePatientId) {
                navigate(getPatientDetailsPath(scopePatientId));
                return;
            }

            navigate(routes.patients);
        },
        onError: (mutationError) => {
            const formatted = formatError(mutationError);
            setError(formatted);
            pushToast({ intent: 'error', text: formatted.message });
        },
    });

    const setFormField = useCallback(<TKey extends keyof VisitFormData>(field: TKey, value: VisitFormData[TKey]) => {
        setFormData((previous) => ({
            ...previous,
            [field]: value,
        }));

        setError(null);
    }, []);

    const handleSaveVisit = useCallback(async () => {
        const trimmedDescription = formData.description.trim();
        if (trimmedDescription.length === 0) {
            const validationError = new Error('Opis wizyty jest wymagany.');
            setError(validationError);
            pushToast({ intent: 'error', text: validationError.message });
            return;
        }

        if (!parseVisitDateTime(formData.visitDateTime)) {
            const validationError = new Error('Wybierz prawidłową datę i godzinę wizyty.');
            setError(validationError);
            pushToast({ intent: 'error', text: validationError.message });
            return;
        }

        if (isEditMode) {
            await updateVisitMutation.mutateAsync();
            return;
        }

        if (!hasValidPatientId) {
            const validationError = new Error('Brak poprawnego pacjenta dla tej wizyty.');
            setError(validationError);
            pushToast({ intent: 'error', text: validationError.message });
            return;
        }

        await createVisitMutation.mutateAsync();
    }, [createVisitMutation, formData.description, formData.visitDateTime, hasValidPatientId, isEditMode, pushToast, updateVisitMutation]);

    const handleGenerateRecommendations = useCallback(async () => {
        if (!isEditMode) {
            const validationError = new Error('Zapisz wizytę, aby móc wygenerować zalecenia AI.');
            setError(validationError);
            pushToast({ intent: 'warning', text: validationError.message });
            return;
        }

        const trimmedLength = formData.description.trim().length;
        if (trimmedLength < MIN_DESCRIPTION_LENGTH) {
            const validationError = new Error(`Dodaj jeszcze ${MIN_DESCRIPTION_LENGTH - trimmedLength} znaków opisu przed generowaniem.`);
            setError(validationError);
            pushToast({ intent: 'warning', text: validationError.message });
            return;
        }

        await generateRecommendationsMutation.mutateAsync();
    }, [generateRecommendationsMutation, isEditMode, pushToast, formData.description]);

    const handleSaveRecommendations = useCallback(async () => {
        const trimmed = formData.recommendations.trim();
        if (trimmed.length === 0) {
            const validationError = new Error('Nie możesz zapisać pustych zaleceń.');
            setError(validationError);
            pushToast({ intent: 'error', text: validationError.message });
            return;
        }

        if (!isEditMode) {
            const validationError = new Error('Zapisz wizytę przed zapisaniem zaleceń.');
            setError(validationError);
            pushToast({ intent: 'warning', text: validationError.message });
            return;
        }

        await saveRecommendationsMutation.mutateAsync();
    }, [formData.recommendations, isEditMode, pushToast, saveRecommendationsMutation]);

    const handleDeleteVisit = useCallback(async () => {
        if (!isEditMode) {
            const validationError = new Error('Wizyta nie została jeszcze zapisana.');
            setError(validationError);
            pushToast({ intent: 'warning', text: validationError.message });
            return;
        }

        await deleteVisitMutation.mutateAsync();
    }, [deleteVisitMutation, isEditMode, pushToast]);

    const isLoading = visitQuery.isLoading;
    const isGenerating = generateRecommendationsMutation.isPending;
    const isSaving = createVisitMutation.isPending
        || updateVisitMutation.isPending
        || saveRecommendationsMutation.isPending
        || deleteVisitMutation.isPending;

    return useMemo<VisitFormViewModel>(() => ({
        formData,
        patientId: resolvedPatientId,
        isEditMode,
        isLoading,
        isGenerating,
        isSaving,
        error,
        etag,
        recommendationsGeneratedByAi,
        latestAiGenerationId,
        setFormField,
        handleSaveVisit,
        handleGenerateRecommendations,
        handleSaveRecommendations,
        handleDeleteVisit,
    }), [
        etag,
        error,
        formData,
        handleDeleteVisit,
        handleGenerateRecommendations,
        handleSaveRecommendations,
        handleSaveVisit,
        isEditMode,
        isGenerating,
        isLoading,
        isSaving,
        latestAiGenerationId,
        resolvedPatientId,
        recommendationsGeneratedByAi,
        setFormField,
    ]);
};
