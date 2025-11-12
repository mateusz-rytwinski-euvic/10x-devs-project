import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchPatients } from '../services/patientService';
import type {
    PaginatedResponseDto,
    PatientListItem,
    PatientListRecord,
    PatientSortField,
    PatientSortOrder,
} from '../types/patient';
import { useAuth } from './useAuth';

export interface PaginationState {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
    canGoToPrevious: boolean;
    canGoToNext: boolean;
}

export interface SortState {
    field: PatientSortField;
    order: PatientSortOrder;
}

export interface UsePatientsViewModelResult {
    patients: PatientListItem[];
    isLoading: boolean;
    isFetching: boolean;
    error: Error | null;
    pagination: PaginationState;
    sort: SortState;
    searchQuery: string;
    handleSearch: (query: string) => void;
    handlePageChange: (page: number) => void;
    handleSort: (field: PatientSortField) => void;
}

const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_SORT_FIELD: PatientSortField = 'lastName';
const DEFAULT_SORT_ORDER: PatientSortOrder = 'asc';

const resolveDefaultOrderForField = (field: PatientSortField): PatientSortOrder => {
    if (field === 'lastName') {
        return 'asc';
    }

    return 'desc';
};

const formatLastVisitDate = (value: string | null): string => {
    if (!value) {
        return 'Brak wizyt';
    }

    try {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return 'Brak wizyt';
        }

        return new Intl.DateTimeFormat('pl-PL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(date);
    } catch (error) {
        console.error('Failed to format last visit date.', error);
        return 'Brak wizyt';
    }
};

const formatCreatedAt = (value: string): string => {
    try {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return '';
        }

        return new Intl.DateTimeFormat('pl-PL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(date);
    } catch (error) {
        console.error('Failed to format created at date.', error);
        return '';
    }
};

const mapRecordToViewModel = (record: PatientListRecord): PatientListItem => ({
    id: record.id,
    firstName: record.firstName,
    lastName: record.lastName,
    visitsCount: record.visitCount,
    lastVisitDate: formatLastVisitDate(record.latestVisitDate),
    etag: record.etag,
    createdAtLabel: formatCreatedAt(record.createdAt),
});

// usePatientsViewModel orchestrates query parameters, debounced searching, and data fetching for the patients dashboard.
export const usePatientsViewModel = (): UsePatientsViewModelResult => {
    const { session } = useAuth();

    const [page, setPage] = useState<number>(1);
    const [pageSize] = useState<number>(DEFAULT_PAGE_SIZE);
    const [sortField, setSortField] = useState<PatientSortField>(DEFAULT_SORT_FIELD);
    const [sortOrder, setSortOrder] = useState<PatientSortOrder>(DEFAULT_SORT_ORDER);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');

    useEffect(() => {
        const handle = window.setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), SEARCH_DEBOUNCE_MS);

        return () => {
            window.clearTimeout(handle);
        };
    }, [searchQuery]);

    const queryResult = useQuery<PaginatedResponseDto<PatientListRecord>, Error>({
        queryKey: [
            'patients',
            session?.userId,
            page,
            pageSize,
            debouncedSearchQuery,
            sortField,
            sortOrder,
        ],
        queryFn: () =>
            fetchPatients({
                token: session?.accessToken,
                query: {
                    page,
                    pageSize,
                    search: debouncedSearchQuery || undefined,
                    sort: sortField,
                    order: sortOrder,
                },
            }),
        enabled: Boolean(session?.accessToken),
        staleTime: 30_000,
    });

    const patients = useMemo(() => {
        if (!queryResult.data) {
            return [];
        }

        return queryResult.data.items.map(mapRecordToViewModel);
    }, [queryResult.data]);

    const pagination = useMemo<PaginationState>(() => {
        const totalPages = queryResult.data?.totalPages ?? 0;
        const totalItems = queryResult.data?.totalItems ?? 0;

        return {
            currentPage: page,
            pageSize,
            totalPages,
            totalCount: totalItems,
            canGoToPrevious: page > 1,
            canGoToNext: totalPages > 0 ? page < totalPages : false,
        };
    }, [page, pageSize, queryResult.data?.totalItems, queryResult.data?.totalPages]);

    const handleSearch = useCallback((query: string) => {
        setPage(1);
        setSearchQuery(query);
    }, []);

    const handlePageChange = useCallback(
        (nextPage: number) => {
            setPage((current) => {
                if (Number.isNaN(nextPage) || nextPage < 1) {
                    return current;
                }

                const totalPages = queryResult.data?.totalPages ?? current;

                if (totalPages > 0 && nextPage > totalPages) {
                    return current;
                }

                return nextPage;
            });
        },
        [queryResult.data?.totalPages],
    );

    const handleSort = useCallback(
        (field: PatientSortField) => {
            if (!field) {
                return;
            }

            setPage(1);
            setSortOrder((previous) => {
                if (field === sortField) {
                    return previous === 'asc' ? 'desc' : 'asc';
                }

                return resolveDefaultOrderForField(field);
            });
            setSortField(field);
        },
        [sortField],
    );

    const sort = useMemo<SortState>(
        () => ({
            field: sortField,
            order: sortOrder,
        }),
        [sortField, sortOrder],
    );

    const error = useMemo(() => {
        if (!queryResult.error) {
            return null;
        }

        if (queryResult.error instanceof Error) {
            return queryResult.error;
        }

        return new Error('Nie udało się pobrać listy pacjentów.');
    }, [queryResult.error]);

    return {
        patients,
        isLoading: queryResult.isLoading,
        isFetching: queryResult.isFetching,
        error,
        pagination,
        sort,
        searchQuery,
        handleSearch,
        handlePageChange,
        handleSort,
    };
};