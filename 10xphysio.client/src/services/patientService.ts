import type { PaginatedResponseDto, PatientListRecord, PatientsQueryParams } from '../types/patient';
import type {
    PatientDetailsDto,
    PatientDetailsQueryOptions,
    PatientUpdateCommand,
    ValidationErrors,
    VisitSummaryDto,
} from '../types/patientDetails';

// PatientsEndpointError extends Error to carry the HTTP status for upstream error handling.
class PatientsEndpointError extends Error {
    public readonly status?: number;

    public readonly validationErrors?: ValidationErrors;

    public readonly correlationId?: string;

    constructor(message: string, status?: number, validationErrors?: ValidationErrors, correlationId?: string) {
        super(message);
        this.name = 'PatientsEndpointError';
        this.status = status;
        this.validationErrors = validationErrors;
        this.correlationId = correlationId;
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

const readErrorResponse = async (response: Response): Promise<unknown> => {
    try {
        return await response.json();
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

const PATIENT_DETAILS_ERROR_MESSAGE = 'Nie udało się pobrać szczegółów pacjenta. Spróbuj ponownie później.';
const PATIENT_UPDATE_ERROR_MESSAGE = 'Nie udało się zaktualizować danych pacjenta. Spróbuj ponownie.';

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null;
};

const toOptionalString = (value: unknown): string | null => {
    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    return null;
};

const extractCorrelationId = (payload: unknown): string | undefined => {
    if (!isRecord(payload)) {
        return undefined;
    }

    const correlation = payload.correlationId ?? payload.CorrelationId;

    return typeof correlation === 'string' ? correlation : undefined;
};

const extractMessage = (payload: unknown): string | undefined => {
    if (!isRecord(payload)) {
        return undefined;
    }

    const candidates: unknown[] = [payload.message, payload.Message, payload.title, payload.Title, payload.detail, payload.Detail];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            return candidate;
        }
    }

    return undefined;
};

const extractValidationErrors = (payload: unknown): ValidationErrors | undefined => {
    if (!isRecord(payload) || !('errors' in payload) || !isRecord((payload as Record<string, unknown>).errors)) {
        return undefined;
    }

    const errorsSection = (payload as { errors: Record<string, unknown> }).errors;
    const validationErrors: ValidationErrors = {};

    Object.entries(errorsSection).forEach(([key, value]) => {
        if (!Array.isArray(value) || value.length === 0) {
            return;
        }

        const messageCandidate = value.find((item) => typeof item === 'string');
        const message = typeof messageCandidate === 'string' ? messageCandidate : undefined;

        if (!message) {
            return;
        }

        const normalizedKey = key.toLowerCase();

        if (normalizedKey.includes('firstname')) {
            validationErrors.firstName = message;
            return;
        }

        if (normalizedKey.includes('lastname')) {
            validationErrors.lastName = message;
            return;
        }

        if (normalizedKey.includes('dateofbirth')) {
            validationErrors.dateOfBirth = message;
            return;
        }

        validationErrors.general = message;
    });

    return Object.keys(validationErrors).length > 0 ? validationErrors : undefined;
};

const resolvePatientDetailsErrorMessage = (status: number | undefined, fallback: string): string => {
    if (status === 400) {
        return 'Wysłano nieprawidłowe parametry zapytania.';
    }

    if (status === 401) {
        return 'Sesja wygasła. Zaloguj się ponownie.';
    }

    if (status === 404) {
        return 'Nie znaleziono pacjenta. Mógł zostać usunięty.';
    }

    if (status === 502) {
        return 'Usługa pacjentów jest chwilowo niedostępna. Spróbuj ponownie za chwilę.';
    }

    return fallback;
};

const resolvePatientUpdateErrorMessage = (status: number | undefined, fallback: string): string => {
    if (status === 400 || status === 422) {
        return 'Nie udało się zapisać zmian. Sprawdź poprawność danych.';
    }

    if (status === 401) {
        return 'Sesja wygasła. Zaloguj się ponownie.';
    }

    if (status === 404) {
        return 'Nie znaleziono pacjenta. Mógł zostać usunięty.';
    }

    if (status === 409 || status === 412) {
        return 'Dane pacjenta zostały zmodyfikowane przez innego użytkownika. Odśwież widok i spróbuj ponownie.';
    }

    if (status === 502) {
        return 'Serwis pacjentów jest chwilowo niedostępny. Spróbuj ponownie później.';
    }

    return fallback;
};

const buildPatientDetailsQueryString = (options: PatientDetailsQueryOptions): string => {
    const params = new URLSearchParams();

    params.set('includeVisits', String(Boolean(options.includeVisits)));

    if (typeof options.visitsLimit === 'number' && Number.isFinite(options.visitsLimit)) {
        params.set('visitsLimit', String(options.visitsLimit));
    }

    const queryString = params.toString();

    return queryString.length > 0 ? `?${queryString}` : '';
};

const mapVisitSummaryPayload = (input: unknown): VisitSummaryDto | null => {
    if (!isRecord(input)) {
        return null;
    }

    const id = toOptionalString(input.id ?? input.Id);
    const visitDate = toOptionalString(input.visitDate ?? input.VisitDate);

    if (!id || !visitDate) {
        return null;
    }

    const description = toOptionalString(input.description ?? input.Description) ?? '';
    const recommendations = toOptionalString(input.recommendations ?? input.Recommendations);
    const hasRecommendationsCandidate = input.hasRecommendations ?? input.HasRecommendations;
    const hasRecommendations = typeof hasRecommendationsCandidate === 'boolean'
        ? hasRecommendationsCandidate
        : Boolean(recommendations && recommendations.trim().length > 0);
    const updatedAt = toOptionalString(input.updatedAt ?? input.UpdatedAt) ?? visitDate;
    const eTag = toOptionalString(input.eTag ?? input.ETag) ?? undefined;

    return {
        id,
        visitDate,
        description,
        hasRecommendations,
        updatedAt,
        eTag,
    };
};

const normalizePatientDetailsPayload = (payload: unknown): PatientDetailsDto => {
    if (!isRecord(payload)) {
        console.error('Patient details endpoint returned a payload with unexpected shape.', payload);
        throw new PatientsEndpointError(PATIENT_DETAILS_ERROR_MESSAGE);
    }

    const id = toOptionalString(payload.id ?? payload.Id);
    const firstName = toOptionalString(payload.firstName ?? payload.FirstName) ?? '';
    const lastName = toOptionalString(payload.lastName ?? payload.LastName) ?? '';
    const createdAt = toOptionalString(payload.createdAt ?? payload.CreatedAt);
    const updatedAt = toOptionalString(payload.updatedAt ?? payload.UpdatedAt);
    const eTag = toOptionalString(payload.eTag ?? payload.ETag) ?? '';

    if (!id || !createdAt || !updatedAt) {
        console.error('Patient details payload missing required fields.', payload);
        throw new PatientsEndpointError(PATIENT_DETAILS_ERROR_MESSAGE);
    }

    const dateOfBirthValue = payload.dateOfBirth ?? payload.DateOfBirth;
    const dateOfBirth = typeof dateOfBirthValue === 'string' ? dateOfBirthValue : null;
    const visitsSource = payload.visits ?? payload.Visits;
    const visits: VisitSummaryDto[] = [];

    if (Array.isArray(visitsSource)) {
        for (const visitPayload of visitsSource) {
            const mappedVisit = mapVisitSummaryPayload(visitPayload);

            if (mappedVisit) {
                visits.push(mappedVisit);
            }
        }
    }

    return {
        id,
        firstName,
        lastName,
        dateOfBirth,
        createdAt,
        updatedAt,
        eTag,
        visits,
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
        const apiError = (await readErrorResponse(response)) as { message?: string } | null;
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

export const getPatientDetails = async (
    patientId: string,
    options: PatientDetailsQueryOptions,
    token: string | null | undefined,
): Promise<PatientDetailsDto> => {
    if (!token) {
        console.error('getPatientDetails invoked without an access token.');
        throw new PatientsEndpointError('Brak tokenu autoryzacyjnego.', 401);
    }

    if (!patientId) {
        throw new PatientsEndpointError('Nieprawidłowy identyfikator pacjenta.', 400);
    }

    const queryString = buildPatientDetailsQueryString(options);
    const url = `${PATIENTS_ENDPOINT}/${encodeURIComponent(patientId)}${queryString}`;

    let response: Response;

    try {
        response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
    } catch (networkError) {
        console.error('Network request to fetch patient details failed before reaching the server.', networkError);
        throw new PatientsEndpointError('Nie udało się połączyć z serwerem pacjentów.', undefined);
    }

    if (!response.ok) {
        const errorPayload = await readErrorResponse(response);
        const validationErrors = response.status === 400 ? extractValidationErrors(errorPayload) : undefined;
        const correlationId = extractCorrelationId(errorPayload);
        const messageFromPayload = extractMessage(errorPayload);
        const message = resolvePatientDetailsErrorMessage(
            response.status,
            messageFromPayload ?? PATIENT_DETAILS_ERROR_MESSAGE,
        );

        console.error('Patient details endpoint responded with a non-success status.', {
            status: response.status,
            message,
            payload: errorPayload,
        });

        throw new PatientsEndpointError(message, response.status, validationErrors, correlationId);
    }

    try {
        const payload = await response.json();
        return normalizePatientDetailsPayload(payload);
    } catch (parseError) {
        console.error('Failed to parse patient details response.', parseError);
        throw new PatientsEndpointError(PATIENT_DETAILS_ERROR_MESSAGE, response.status);
    }
};

interface UpdatePatientOptions {
    patientId: string;
    command: PatientUpdateCommand;
    token: string;
    etag: string;
}

export const updatePatient = async ({ patientId, command, token, etag }: UpdatePatientOptions): Promise<PatientDetailsDto> => {
    if (!token) {
        console.error('updatePatient invoked without an access token.');
        throw new PatientsEndpointError('Brak tokenu autoryzacyjnego.', 401);
    }

    if (!patientId) {
        throw new PatientsEndpointError('Nieprawidłowy identyfikator pacjenta.', 400);
    }

    if (!etag) {
        throw new PatientsEndpointError('Brak znacznika ETag dla aktualizacji pacjenta.', 412);
    }

    const url = `${PATIENTS_ENDPOINT}/${encodeURIComponent(patientId)}`;

    let response: Response;

    try {
        response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                'If-Match': etag,
            },
            body: JSON.stringify(command),
        });
    } catch (networkError) {
        console.error('Network request to update patient failed before reaching the server.', networkError);
        throw new PatientsEndpointError('Nie udało się połączyć z serwerem pacjentów.', undefined);
    }

    if (!response.ok) {
        const errorPayload = await readErrorResponse(response);
        const validationErrors =
            response.status === 400 || response.status === 422 ? extractValidationErrors(errorPayload) : undefined;
        const correlationId = extractCorrelationId(errorPayload);
        const messageFromPayload = extractMessage(errorPayload);
        const message = resolvePatientUpdateErrorMessage(
            response.status,
            messageFromPayload ?? PATIENT_UPDATE_ERROR_MESSAGE,
        );

        console.error('Patient update endpoint responded with a non-success status.', {
            status: response.status,
            message,
            payload: errorPayload,
        });

        throw new PatientsEndpointError(message, response.status, validationErrors, correlationId);
    }

    try {
        const payload = await response.json();
        return normalizePatientDetailsPayload(payload);
    } catch (parseError) {
        console.error('Failed to parse patient update response.', parseError);
        throw new PatientsEndpointError(PATIENT_UPDATE_ERROR_MESSAGE, response.status);
    }
};
