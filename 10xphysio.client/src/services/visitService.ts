import type { VisitCreateCommand, VisitDto } from '../types/visit';

type NullableString = string | null | undefined;

type VisitErrorShape = Record<string, unknown> & {
    correlationId?: string;
    message?: string;
    Message?: string;
    title?: string;
    Title?: string;
    detail?: string;
    Detail?: string;
};

/**
 * VisitsEndpointError extends Error to carry HTTP metadata for upstream components.
 */
export class VisitsEndpointError extends Error {
    public readonly status?: number;

    public readonly correlationId?: string;

    constructor(message: string, status?: number, correlationId?: string) {
        super(message);
        this.name = 'VisitsEndpointError';
        this.status = status;
        this.correlationId = correlationId;
    }
}

const PATIENT_VISITS_ENDPOINT = '/api/patients';
const VISITS_ENDPOINT = '/api/visits';

const CREATE_VISIT_FALLBACK_MESSAGE = 'Nie udało się utworzyć wizyty. Spróbuj ponownie później.';
const GET_VISIT_FALLBACK_MESSAGE = 'Nie udało się pobrać danych wizyty. Spróbuj ponownie.';

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null;
};

const readErrorResponse = async (response: Response): Promise<VisitErrorShape | null> => {
    try {
        const payload = (await response.json()) as VisitErrorShape;
        return payload;
    } catch {
        return null;
    }
};

const extractMessage = (payload: VisitErrorShape | null): string | undefined => {
    if (!payload) {
        return undefined;
    }

    const candidates: Array<unknown> = [
        payload.message,
        payload.Message,
        payload.title,
        payload.Title,
        payload.detail,
        payload.Detail,
    ];

    return candidates.find((candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0);
};

const extractCorrelationId = (payload: VisitErrorShape | null): string | undefined => {
    if (!payload) {
        return undefined;
    }

    const candidate = payload.correlationId ?? (payload as { CorrelationId?: unknown }).CorrelationId;
    return typeof candidate === 'string' ? candidate : undefined;
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

const normalizeVisitPayload = (payload: unknown): VisitDto => {
    if (!isRecord(payload)) {
        console.error('Visit endpoint returned unexpected payload.', payload);
        throw new VisitsEndpointError(GET_VISIT_FALLBACK_MESSAGE);
    }

    const id = toOptionalString(payload.id ?? payload.Id);
    const patientId = toOptionalString(payload.patientId ?? payload.PatientId);
    const visitDate = toOptionalString(payload.visitDate ?? payload.VisitDate);
    const createdAt = toOptionalString(payload.createdAt ?? payload.CreatedAt);
    const updatedAt = toOptionalString(payload.updatedAt ?? payload.UpdatedAt);
    const eTag = toOptionalString(payload.eTag ?? payload.ETag) ?? '';

    if (!id || !patientId || !visitDate || !createdAt || !updatedAt || !eTag) {
        console.error('Visit payload missing required fields.', payload);
        throw new VisitsEndpointError(GET_VISIT_FALLBACK_MESSAGE);
    }

    return {
        id,
        patientId,
        visitDate,
        interview: toOptionalString(payload.interview ?? payload.Interview),
        description: toOptionalString(payload.description ?? payload.Description),
        recommendations: toOptionalString(payload.recommendations ?? payload.Recommendations),
        recommendationsGeneratedByAi: Boolean(payload.recommendationsGeneratedByAi ?? payload.RecommendationsGeneratedByAi),
        recommendationsGeneratedAt: toOptionalString(payload.recommendationsGeneratedAt ?? payload.RecommendationsGeneratedAt),
        createdAt,
        updatedAt,
        eTag,
        aiGenerationCount: typeof payload.aiGenerationCount === 'number'
            ? payload.aiGenerationCount
            : typeof (payload as { AiGenerationCount?: unknown }).AiGenerationCount === 'number'
                ? (payload as { AiGenerationCount: number }).AiGenerationCount
                : null,
        latestAiGenerationId: toOptionalString(payload.latestAiGenerationId ?? (payload as { LatestAiGenerationId?: unknown }).LatestAiGenerationId),
    };
};

const resolveCreateVisitErrorMessage = (status: number | undefined, fallback: string): string => {
    if (status === 400 || status === 422) {
        return 'Nie udało się utworzyć wizyty. Sprawdź poprawność danych.';
    }

    if (status === 401) {
        return 'Sesja wygasła. Zaloguj się ponownie.';
    }

    if (status === 403) {
        return 'Nie masz uprawnień do utworzenia wizyty dla tego pacjenta.';
    }

    if (status === 404) {
        return 'Nie znaleziono pacjenta lub został usunięty.';
    }

    if (status === 502) {
        return 'Usługa wizyt jest chwilowo niedostępna. Spróbuj ponownie za chwilę.';
    }

    return fallback;
};

const resolveGetVisitErrorMessage = (status: number | undefined, fallback: string): string => {
    if (status === 401) {
        return 'Sesja wygasła. Zaloguj się ponownie.';
    }

    if (status === 403) {
        return 'Nie masz dostępu do tej wizyty.';
    }

    if (status === 404) {
        return 'Wizyta nie została znaleziona.';
    }

    if (status === 502) {
        return 'Serwis wizyt jest chwilowo niedostępny. Spróbuj ponownie później.';
    }

    return fallback;
};

const ensureToken = (token: NullableString, errorMessage: string): string => {
    if (!token) {
        console.error('visit service invoked without an access token.');
        throw new VisitsEndpointError(errorMessage, 401);
    }

    return token;
};

/**
 * createVisit executes POST /patients/{patientId}/visits.
 */
export const createVisit = async (
    patientId: string,
    command: VisitCreateCommand,
    token: NullableString,
): Promise<VisitDto> => {
    const resolvedToken = ensureToken(token, 'Brak tokenu autoryzacyjnego.');

    if (!patientId) {
        throw new VisitsEndpointError('Nieprawidłowy identyfikator pacjenta.', 400);
    }

    const url = `${PATIENT_VISITS_ENDPOINT}/${encodeURIComponent(patientId)}/visits`;

    let response: Response;

    try {
        response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${resolvedToken}`,
            },
            body: JSON.stringify(command),
        });
    } catch (networkError) {
        console.error('Network request to create visit failed.', networkError);
        throw new VisitsEndpointError(CREATE_VISIT_FALLBACK_MESSAGE);
    }

    if (!response.ok) {
        const errorPayload = await readErrorResponse(response);
        const message = resolveCreateVisitErrorMessage(
            response.status,
            extractMessage(errorPayload) ?? CREATE_VISIT_FALLBACK_MESSAGE,
        );
        const correlationId = extractCorrelationId(errorPayload);

        console.error('Create visit endpoint responded with non-success status.', {
            status: response.status,
            payload: errorPayload,
        });

        throw new VisitsEndpointError(message, response.status, correlationId);
    }

    try {
        const payload = await response.json();
        return normalizeVisitPayload(payload);
    } catch (parseError) {
        console.error('Failed to parse create visit response payload.', parseError);
        throw new VisitsEndpointError(CREATE_VISIT_FALLBACK_MESSAGE, response.status);
    }
};

/**
 * getVisit executes GET /visits/{visitId}.
 */
export const getVisit = async (visitId: string, token: NullableString): Promise<VisitDto> => {
    const resolvedToken = ensureToken(token, 'Brak tokenu autoryzacyjnego.');

    if (!visitId) {
        throw new VisitsEndpointError('Nieprawidłowy identyfikator wizyty.', 400);
    }

    const url = `${VISITS_ENDPOINT}/${encodeURIComponent(visitId)}`;

    let response: Response;

    try {
        response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${resolvedToken}`,
            },
        });
    } catch (networkError) {
        console.error('Network request to fetch visit failed.', networkError);
        throw new VisitsEndpointError(GET_VISIT_FALLBACK_MESSAGE);
    }

    if (!response.ok) {
        const errorPayload = await readErrorResponse(response);
        const message = resolveGetVisitErrorMessage(
            response.status,
            extractMessage(errorPayload) ?? GET_VISIT_FALLBACK_MESSAGE,
        );
        const correlationId = extractCorrelationId(errorPayload);

        console.error('Get visit endpoint responded with non-success status.', {
            status: response.status,
            payload: errorPayload,
        });

        throw new VisitsEndpointError(message, response.status, correlationId);
    }

    try {
        const payload = await response.json();
        return normalizeVisitPayload(payload);
    } catch (parseError) {
        console.error('Failed to parse visit response.', parseError);
        throw new VisitsEndpointError(GET_VISIT_FALLBACK_MESSAGE, response.status);
    }
};
