import type { PaginatedResponseDto, PatientListRecord, PatientsQueryParams } from '../types/patient';

// PatientsEndpointError extends Error to carry the HTTP status for upstream error handling.
class PatientsEndpointError extends Error {
    public readonly status?: number;

    constructor(message: string, status?: number) {
        super(message);
        this.name = 'PatientsEndpointError';
        this.status = status;
    }
}

const PATIENTS_ENDPOINT = '/api/Patients';

const DEFAULT_ERROR_MESSAGE = 'Nie udało się pobrać listy pacjentów. Spróbuj ponownie później.';

type NullableString = string | null | undefined;

interface FetchPatientsOptions {
    token: NullableString;
    query: PatientsQueryParams;
}

const resolveErrorMessage = (status: number | undefined, fallback: string): string => {
    if (status === 400) {
        return 'Wysłano nieprawidłowe parametry filtrów. Zaktualizuj je i spróbuj ponownie.';
    }

    if (status === 401) {
        return 'Sesja wygasła. Zaloguj się ponownie.';
    }

    if (status === 502) {
        return 'Usługa pacjentów jest chwilowo niedostępna. Spróbuj ponownie za minutę.';
    }

    return fallback;
};

const readErrorResponse = async (response: Response): Promise<{ message?: string } | null> => {
    try {
        return (await response.json()) as { message?: string };
    } catch {
        return null;
    }
};

const buildQueryString = (query: PatientsQueryParams): string => {
    const params = new URLSearchParams();

    params.set('page', String(query.page));
    params.set('pageSize', String(query.pageSize));

    if (query.search && query.search.trim().length > 0) {
        params.set('search', query.search.trim());
    }

    if (query.sort) {
        params.set('sort', query.sort);
    }

    if (query.order) {
        params.set('order', query.order);
    }

    return params.toString();
};

interface PatientListItemRaw {
    Id: string;
    FirstName: string;
    LastName: string;
    DateOfBirth?: string | null;
    CreatedAt: string;
    UpdatedAt: string;
    LatestVisitDate: string | null;
    VisitCount: number;
    ETag: string;
}

interface PaginatedPatientsResponseRaw {
    Items: PatientListItemRaw[];
    Page: number;
    PageSize: number;
    TotalItems: number;
    TotalPages: number;
}

const mapPatientListItem = (input: PatientListItemRaw): PatientListRecord => ({
    id: input.Id,
    firstName: input.FirstName,
    lastName: input.LastName,
    dateOfBirth: input.DateOfBirth ?? null,
    createdAt: input.CreatedAt,
    updatedAt: input.UpdatedAt,
    latestVisitDate: input.LatestVisitDate ?? null,
    visitCount: input.VisitCount,
    etag: input.ETag,
});

const isPascalCasePayload = (payload: unknown): payload is PaginatedPatientsResponseRaw => {
    if (!payload || typeof payload !== 'object') {
        return false;
    }

    return 'Items' in payload;
};

const isCamelCasePayload = (
    payload: unknown,
): payload is PaginatedResponseDto<PatientListRecord> => {
    if (!payload || typeof payload !== 'object') {
        return false;
    }

    return 'items' in payload;
};

const normalizePaginatedResponse = (
    payload: unknown,
): PaginatedResponseDto<PatientListRecord> => {
    if (isCamelCasePayload(payload)) {
        return payload;
    }

    if (!isPascalCasePayload(payload)) {
        console.warn('Received patients payload with unexpected shape. Falling back to empty collection.', payload);
        return {
            items: [],
            page: 1,
            pageSize: 0,
            totalItems: 0,
            totalPages: 0,
        };
    }

    return {
        items: (payload.Items ?? []).map(mapPatientListItem),
        page: payload.Page,
        pageSize: payload.PageSize,
        totalItems: payload.TotalItems,
        totalPages: payload.TotalPages,
    };
};

// fetchPatients executes a GET request to the patients endpoint and returns the typed paginated payload.
export const fetchPatients = async ({ token, query }: FetchPatientsOptions): Promise<
    PaginatedResponseDto<PatientListRecord>
> => {
    if (!token) {
        console.error('fetchPatients invoked without an access token.');
        throw new PatientsEndpointError('Brak tokenu autoryzacyjnego.', 401);
    }

    const queryString = buildQueryString(query);
    const url = queryString.length > 0 ? `${PATIENTS_ENDPOINT}?${queryString}` : PATIENTS_ENDPOINT;

    let response: Response;

    try {
        response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
    } catch (networkError) {
        console.error('Network request to fetch patients failed before reaching the server.', networkError);
        throw new PatientsEndpointError('Nie udało się połączyć z serwerem pacjentów.', undefined);
    }

    if (!response.ok) {
        const apiError = await readErrorResponse(response);
        const fallbackMessage = apiError?.message ?? DEFAULT_ERROR_MESSAGE;
        const message = resolveErrorMessage(response.status, fallbackMessage);
        console.error('Patients endpoint responded with a non-success status.', {
            status: response.status,
            message: apiError?.message,
        });
        throw new PatientsEndpointError(message, response.status);
    }

    try {
        const payload = await response.json();

        return normalizePaginatedResponse(payload);
    } catch (parseError) {
        console.error('Failed to parse patients endpoint response as JSON.', parseError);
        throw new PatientsEndpointError(DEFAULT_ERROR_MESSAGE, response.status);
    }
};
