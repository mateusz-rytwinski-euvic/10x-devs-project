import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { getVisit } from '../services/visitService';
import type { VisitDto, VisitViewModel } from '../types/visit';
import { formatPolishDate, formatPolishDateTime, formatPolishTime } from '../utils/date';
import { isValidGuid } from '../utils/guid';
import { useAuth } from './useAuth';

export interface UseVisitDetailsResult {
    data?: VisitViewModel;
    isLoading: boolean;
    isError: boolean;
    refetch: () => Promise<VisitViewModel | undefined>;
}

const buildAiGenerationCountLabel = (value: number | null | undefined): string | null => {
    if (typeof value !== 'number' || value <= 0) {
        return null;
    }

    if (value === 1) {
        return '1 generacja AI';
    }

    if (value >= 5) {
        return `${value} generacji AI`;
    }

    return `${value} generacje AI`;
};

/**
 * mapVisitDtoToViewModel normalizes the API payload for UI consumption.
 */
export const mapVisitDtoToViewModel = (dto: VisitDto): VisitViewModel => {
    return {
        id: dto.id,
        patientId: dto.patientId,
        visitDateLabel: formatPolishDate(dto.visitDate, 'Brak daty'),
        visitTimeLabel: formatPolishTime(dto.visitDate, 'Brak godziny'),
        createdAtLabel: formatPolishDateTime(dto.createdAt, 'Brak danych'),
        updatedAtLabel: formatPolishDateTime(dto.updatedAt, 'Brak danych'),
        interview: dto.interview ?? null,
        description: dto.description ?? null,
        recommendations: dto.recommendations ?? null,
        recommendationsGeneratedByAi: Boolean(dto.recommendationsGeneratedByAi),
        recommendationsGeneratedAtLabel: dto.recommendationsGeneratedAt
            ? formatPolishDateTime(dto.recommendationsGeneratedAt, 'Brak daty generowania')
            : null,
        eTag: dto.eTag,
        aiGenerationCountLabel: buildAiGenerationCountLabel(dto.aiGenerationCount ?? undefined),
        latestAiGenerationId: dto.latestAiGenerationId ?? null,
    };
};

/**
 * useVisitDetails fetches visit data and memoizes the view model for render.
 */
export const useVisitDetails = (visitId: string): UseVisitDetailsResult => {
    const { session } = useAuth();
    const token = session?.accessToken ?? null;
    const hasValidId = isValidGuid(visitId);

    const query = useQuery<VisitDto, Error>({
        queryKey: ['visitDetails', visitId, token],
        enabled: Boolean(token) && hasValidId,
        staleTime: 30_000,
        retry: (failureCount, error) => {
            if (error instanceof Error && /nie znaleziono|404/i.test(error.message)) {
                return false;
            }

            return failureCount < 3;
        },
        queryFn: () => {
            if (!hasValidId) {
                return Promise.reject(new Error('Nieprawidłowy identyfikator wizyty.'));
            }

            if (!token) {
                return Promise.reject(new Error('Brak tokenu autoryzacyjnego.'));
            }

            return getVisit(visitId, token);
        },
    });

    const viewModel = useMemo<VisitViewModel | undefined>(() => {
        if (!query.data) {
            return undefined;
        }

        return mapVisitDtoToViewModel(query.data);
    }, [query.data]);

    const refetch = useCallback(async () => {
        const result = await query.refetch();

        if (!result.data) {
            return undefined;
        }

        return mapVisitDtoToViewModel(result.data);
    }, [query]);

    return {
        data: viewModel,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch,
    };
};
