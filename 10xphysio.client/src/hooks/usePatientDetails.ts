import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { getPatientDetails } from '../services/patientService';
import type {
    PatientDetailsDto,
    PatientDetailsQueryOptions,
    PatientDetailsViewModel,
    UsePatientDetailsResult,
    VisitSummaryDto,
    VisitSummaryViewModel,
} from '../types/patientDetails';
import { formatPolishDateTime } from '../utils/date';
import { useAuth } from './useAuth';

interface UsePatientDetailsParams extends PatientDetailsQueryOptions {
    patientId: string;
}

const isValidGuid = (value: string): boolean => {
    if (!value) {
        return false;
    }

    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
        value.trim(),
    );
};

const mapVisitSummary = (visit: VisitSummaryDto): VisitSummaryViewModel => ({
    id: visit.id,
    dateLabel: formatPolishDateTime(visit.visitDate, 'Brak daty wizyty'),
    shortDescription: visit.description?.trim() ?? '',
    hasRecommendations: Boolean(
        (visit.recommendations && visit.recommendations.trim().length > 0)
        || visit.recommendationsGeneratedByAi,
    ),
    updatedAtLabel: formatPolishDateTime(visit.recommendationsGeneratedAt ?? visit.visitDate, 'Brak danych'),
});

const mapPatientDetails = (dto: PatientDetailsDto): PatientDetailsViewModel => {
    const fullName = `${dto.firstName} ${dto.lastName}`.trim();

    return {
        id: dto.id,
        fullName,
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: dto.dateOfBirth ?? null,
        createdAtLabel: formatPolishDateTime(dto.createdAt, ''),
        updatedAtLabel: formatPolishDateTime(dto.updatedAt, ''),
        eTag: dto.eTag,
        visits: (dto.visits ?? []).map(mapVisitSummary),
    };
};

// usePatientDetails fetches and normalizes patient detail data, handling memoization and refetch logic.
export const usePatientDetails = ({
    patientId,
    includeVisits,
    visitsLimit,
}: UsePatientDetailsParams): UsePatientDetailsResult => {
    const { session } = useAuth();
    const hasValidId = isValidGuid(patientId);
    const accessToken = session?.accessToken ?? null;

    const query = useQuery<PatientDetailsDto, Error>({
        queryKey: ['patientDetails', patientId, includeVisits, visitsLimit, accessToken],
        queryFn: () => {
            if (!hasValidId) {
                return Promise.reject(new Error('Nieprawidłowy identyfikator pacjenta.'));
            }

            if (!accessToken) {
                return Promise.reject(new Error('Brak tokenu autoryzacyjnego.'));
            }

            return getPatientDetails(
                patientId,
                {
                    includeVisits,
                    visitsLimit,
                },
                accessToken,
            );
        },
        enabled: Boolean(accessToken) && hasValidId,
        staleTime: 30_000,
        retry: (failureCount, error) => {
            if (error instanceof Error && /nie znaleziono|404/i.test(error.message)) {
                return false;
            }

            return failureCount < 3;
        },
    });

    const viewModel = useMemo<PatientDetailsViewModel | undefined>(() => {
        if (!query.data) {
            return undefined;
        }

        return mapPatientDetails(query.data);
    }, [query.data]);

    const refetch = useCallback(async () => {
        const result = await query.refetch();

        if (!result.data) {
            return undefined;
        }

        return mapPatientDetails(result.data);
    }, [query]);

    return {
        data: viewModel,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch,
    };
};
