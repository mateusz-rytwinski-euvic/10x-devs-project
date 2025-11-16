import type {
    VisitAiGenerationCommand,
    VisitAiGenerationCreatedDto,
    VisitCreateCommand,
    VisitDto,
    VisitRecommendationCommand,
    VisitRecommendationStateDto,
    VisitUpdateCommand,
} from '../types/visit';

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
const UPDATE_VISIT_FALLBACK_MESSAGE = 'Nie udało się zaktualizować wizyty. Spróbuj ponownie.';
const GENERATE_RECOMMENDATIONS_FALLBACK_MESSAGE = 'Nie udało się wygenerować zaleceń. Spróbuj ponownie.';
const SAVE_RECOMMENDATIONS_FALLBACK_MESSAGE = 'Nie udało się zapisać zaleceń. Spróbuj ponownie.';
const DELETE_VISIT_FALLBACK_MESSAGE = 'Nie udało się usunąć wizyty. Spróbuj ponownie.';

const VISIT_API_ERROR_TRANSLATIONS: Record<string, string> = {
    ai_generation_failed: 'Generowanie zaleceń nie powiodło się. Spróbuj ponownie później.',
    ai_generation_missing: 'Nie znaleziono powiązanej generacji AI.',
    ai_generation_persistence_failed: 'Nie udało się zapisać historii generacji AI. Spróbuj ponownie.',
    ai_rate_limited: 'Limit generowania zaleceń został chwilowo wyczerpany. Spróbuj ponownie za kilka minut.',
    model_provider_unavailable: 'Dostawca modelu AI jest chwilowo niedostępny. Spróbuj ponownie później.',
    visit_create_failed: 'Nie udało się utworzyć wizyty. Spróbuj ponownie później.',
    visit_update_failed: 'Nie udało się zaktualizować wizyty. Spróbuj ponownie później.',
    visit_delete_failed: 'Nie udało się usunąć wizyty. Spróbuj ponownie.',
    visit_recommendations_failed: 'Nie udało się zapisać zaleceń. Spróbuj ponownie.',
    visit_missing: 'Wizyta nie została znaleziona.',
    visit_not_owned: 'Nie masz uprawnień do tej wizyty.',
    visit_date_future: 'Nie można zaplanować wizyty tak daleko w przyszłości.',
    visit_content_required: 'Podaj opis, wywiad albo zalecenia, aby zapisać wizytę.',
    recommendations_required: 'Zalecenia są wymagane, aby kontynuować.',
    source_generation_required: 'Wybierz powiązaną generację AI, aby oznaczyć zalecenia jako automatyczne.',
    source_generation_not_allowed: 'Usuń powiązaną generację AI, jeśli zalecenia przygotowano ręcznie.',
    patient_missing: 'Nie znaleziono pacjenta.',
    patient_not_owned: 'Nie masz uprawnień do tego pacjenta.',
    invalid_pagination: 'Parametry paginacji są nieprawidłowe.',
    invalid_date_range: 'Zakres dat jest niepoprawny.',
};

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

const translateVisitApiMessage = (message: NullableString): string | undefined => {
    if (!message) {
        return undefined;
    }

    const normalized = message.trim().toLowerCase();

    if (normalized.length === 0) {
        return undefined;
    }

    return VISIT_API_ERROR_TRANSLATIONS[normalized];
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
    const therapistId = toOptionalString(payload.therapistId ?? (payload as { TherapistId?: unknown }).TherapistId);

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
        therapistId: therapistId ?? null,
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

const resolveUpdateVisitErrorMessage = (status: number | undefined, fallback: string): string => {
    if (status === 400 || status === 422) {
        return 'Nie udało się zaktualizować wizyty. Sprawdź poprawność danych.';
    }

    if (status === 401) {
        return 'Sesja wygasła. Zaloguj się ponownie.';
    }

    if (status === 403) {
        return 'Nie masz uprawnień do edycji tej wizyty.';
    }

    if (status === 404) {
        return 'Wizyta nie istnieje lub została usunięta.';
    }

    if (status === 409 || status === 412) {
        return 'Wizyta została zmodyfikowana w międzyczasie. Odśwież dane i spróbuj ponownie.';
    }

    if (status === 502) {
        return 'Serwis wizyt jest chwilowo niedostępny. Spróbuj ponownie później.';
    }

    return fallback;
};

const resolveGenerateRecommendationsErrorMessage = (status: number | undefined, fallback: string): string => {
    if (status === 400 || status === 422) {
        return 'Opis wizyty jest niewystarczający do wygenerowania zaleceń.';
    }

    if (status === 401) {
        return 'Sesja wygasła. Zaloguj się ponownie.';
    }

    if (status === 403) {
        return 'Nie masz uprawnień do generowania zaleceń dla tej wizyty.';
    }

    if (status === 404) {
        return 'Nie znaleziono wizyty.';
    }

    if (status === 409 || status === 412) {
        return 'Dane wizyty uległy zmianie. Odśwież stronę i spróbuj ponownie.';
    }

    if (status === 429) {
        return 'Limit generowania zaleceń został chwilowo wyczerpany. Spróbuj ponownie za chwilę.';
    }

    if (status === 502) {
        return 'Usługa AI jest chwilowo niedostępna. Spróbuj ponownie później.';
    }

    return fallback;
};

const resolveSaveRecommendationsErrorMessage = (status: number | undefined, fallback: string): string => {
    if (status === 400 || status === 422) {
        return 'Nie udało się zapisać zaleceń. Sprawdź poprawność treści.';
    }

    if (status === 401) {
        return 'Sesja wygasła. Zaloguj się ponownie.';
    }

    if (status === 403) {
        return 'Nie masz uprawnień do zapisywania zaleceń dla tej wizyty.';
    }

    if (status === 404) {
        return 'Nie znaleziono wizyty.';
    }

    if (status === 409 || status === 412) {
        return 'Dane wizyty zostały zmienione. Odśwież dane i spróbuj ponownie.';
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

const normalizeAiGenerationPayload = (payload: unknown): VisitAiGenerationCreatedDto => {
    if (!isRecord(payload)) {
        console.error('AI generation endpoint returned unexpected payload.', payload);
        throw new VisitsEndpointError(GENERATE_RECOMMENDATIONS_FALLBACK_MESSAGE);
    }

    const generationId = toOptionalString(payload.generationId ?? payload.GenerationId);
    const status = toOptionalString(payload.status ?? payload.Status) ?? 'unknown';
    const model = toOptionalString(payload.model ?? payload.Model) ?? 'unknown';
    const prompt = toOptionalString(payload.prompt ?? payload.Prompt) ?? '';
    const aiResponse = toOptionalString(payload.aiResponse ?? payload.AiResponse) ?? '';
    const recommendationsPreview = toOptionalString(payload.recommendationsPreview ?? payload.RecommendationsPreview) ?? '';
    const createdAt = toOptionalString(payload.createdAt ?? payload.CreatedAt);

    const rawTemperature = (payload.temperature ?? (payload as { Temperature?: unknown }).Temperature);
    const temperature = typeof rawTemperature === 'number'
        ? rawTemperature
        : typeof rawTemperature === 'string'
            ? Number.parseFloat(rawTemperature)
            : undefined;

    if (!generationId || !createdAt) {
        console.error('AI generation payload is missing required identifiers.', payload);
        throw new VisitsEndpointError(GENERATE_RECOMMENDATIONS_FALLBACK_MESSAGE);
    }

    return {
        generationId,
        status,
        model,
        temperature: Number.isNaN(temperature) ? undefined : temperature,
        prompt,
        aiResponse,
        recommendationsPreview,
        createdAt,
    };
};

const normalizeRecommendationStatePayload = (payload: unknown): VisitRecommendationStateDto => {
    if (!isRecord(payload)) {
        console.error('Recommendation endpoint returned unexpected payload.', payload);
        throw new VisitsEndpointError(SAVE_RECOMMENDATIONS_FALLBACK_MESSAGE);
    }

    const id = toOptionalString(payload.id ?? payload.Id);
    const recommendations = toOptionalString(payload.recommendations ?? payload.Recommendations) ?? '';
    const createdAt = toOptionalString(payload.updatedAt ?? payload.UpdatedAt);
    const eTag = toOptionalString(payload.eTag ?? payload.ETag) ?? '';
    const recommendationsGeneratedAt = toOptionalString(payload.recommendationsGeneratedAt ?? payload.RecommendationsGeneratedAt);
    const recommendationsGeneratedByAi = Boolean(payload.recommendationsGeneratedByAi ?? payload.RecommendationsGeneratedByAi);

    if (!id || !createdAt || !eTag) {
        console.error('Recommendation payload missing required fields.', payload);
        throw new VisitsEndpointError(SAVE_RECOMMENDATIONS_FALLBACK_MESSAGE);
    }

    return {
        id,
        recommendations,
        recommendationsGeneratedByAi,
        recommendationsGeneratedAt,
        updatedAt: createdAt,
        eTag,
    };
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
        const serverMessage = extractMessage(errorPayload);
        const fallbackMessage = translateVisitApiMessage(serverMessage) ?? serverMessage ?? CREATE_VISIT_FALLBACK_MESSAGE;
        const message = resolveCreateVisitErrorMessage(
            response.status,
            fallbackMessage,
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
        const serverMessage = extractMessage(errorPayload);
        const fallbackMessage = translateVisitApiMessage(serverMessage) ?? serverMessage ?? GET_VISIT_FALLBACK_MESSAGE;
        const message = resolveGetVisitErrorMessage(
            response.status,
            fallbackMessage,
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

/**
 * updateVisit executes PATCH /visits/{visitId} with ETag concurrency control.
 */
export const updateVisit = async (
    visitId: string,
    command: VisitUpdateCommand,
    token: NullableString,
    etag: string,
): Promise<VisitDto> => {
    const resolvedToken = ensureToken(token, 'Brak tokenu autoryzacyjnego.');

    if (!visitId) {
        throw new VisitsEndpointError('Nieprawidłowy identyfikator wizyty.', 400);
    }

    if (!etag || etag.trim().length === 0) {
        throw new VisitsEndpointError('Brak etykiety wersji danych wizyty (ETag).', 428);
    }

    const url = `${VISITS_ENDPOINT}/${encodeURIComponent(visitId)}`;

    let response: Response;

    try {
        response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${resolvedToken}`,
                'If-Match': etag,
            },
            body: JSON.stringify(command),
        });
    } catch (networkError) {
        console.error('Network request to update visit failed.', networkError);
        throw new VisitsEndpointError(UPDATE_VISIT_FALLBACK_MESSAGE);
    }

    if (!response.ok) {
        const errorPayload = await readErrorResponse(response);
        const serverMessage = extractMessage(errorPayload);
        const fallbackMessage = translateVisitApiMessage(serverMessage) ?? serverMessage ?? UPDATE_VISIT_FALLBACK_MESSAGE;
        const message = resolveUpdateVisitErrorMessage(
            response.status,
            fallbackMessage,
        );
        const correlationId = extractCorrelationId(errorPayload);

        console.error('Update visit endpoint responded with non-success status.', {
            status: response.status,
            payload: errorPayload,
        });

        throw new VisitsEndpointError(message, response.status, correlationId);
    }

    try {
        const payload = await response.json();
        return normalizeVisitPayload(payload);
    } catch (parseError) {
        console.error('Failed to parse update visit response payload.', parseError);
        throw new VisitsEndpointError(UPDATE_VISIT_FALLBACK_MESSAGE, response.status);
    }
};

/**
 * generateVisitRecommendations executes POST /visits/{visitId}/ai-generation.
 */
export const generateVisitRecommendations = async (
    visitId: string,
    command: VisitAiGenerationCommand,
    token: NullableString,
): Promise<VisitAiGenerationCreatedDto> => {
    const resolvedToken = ensureToken(token, 'Brak tokenu autoryzacyjnego.');

    if (!visitId) {
        throw new VisitsEndpointError('Nieprawidłowy identyfikator wizyty.', 400);
    }

    const url = `${VISITS_ENDPOINT}/${encodeURIComponent(visitId)}/ai-generation`;

    let response: Response;

    try {
        response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${resolvedToken}`,
            },
            body: JSON.stringify(command ?? {}),
        });
    } catch (networkError) {
        console.error('Network request to generate AI recommendations failed.', networkError);
        throw new VisitsEndpointError(GENERATE_RECOMMENDATIONS_FALLBACK_MESSAGE);
    }

    if (!response.ok) {
        const errorPayload = await readErrorResponse(response);
        const serverMessage = extractMessage(errorPayload);
        const fallbackMessage = translateVisitApiMessage(serverMessage) ?? serverMessage ?? GENERATE_RECOMMENDATIONS_FALLBACK_MESSAGE;
        const message = resolveGenerateRecommendationsErrorMessage(
            response.status,
            fallbackMessage,
        );
        const correlationId = extractCorrelationId(errorPayload);

        console.error('Generate recommendations endpoint responded with non-success status.', {
            status: response.status,
            payload: errorPayload,
        });

        throw new VisitsEndpointError(message, response.status, correlationId);
    }

    try {
        const payload = await response.json();
        return normalizeAiGenerationPayload(payload);
    } catch (parseError) {
        console.error('Failed to parse generate recommendations response payload.', parseError);
        throw new VisitsEndpointError(GENERATE_RECOMMENDATIONS_FALLBACK_MESSAGE, response.status);
    }
};

/**
 * saveVisitRecommendations executes PUT /visits/{visitId}/recommendations guarded by ETag.
 */
export const saveVisitRecommendations = async (
    visitId: string,
    command: VisitRecommendationCommand,
    token: NullableString,
    etag: string,
): Promise<VisitRecommendationStateDto> => {
    const resolvedToken = ensureToken(token, 'Brak tokenu autoryzacyjnego.');

    if (!visitId) {
        throw new VisitsEndpointError('Nieprawidłowy identyfikator wizyty.', 400);
    }

    if (!command.recommendations || command.recommendations.trim().length === 0) {
        throw new VisitsEndpointError('Treść zaleceń nie może być pusta.', 422);
    }

    if (!etag || etag.trim().length === 0) {
        throw new VisitsEndpointError('Brak etykiety wersji danych wizyty (ETag).', 428);
    }

    const url = `${VISITS_ENDPOINT}/${encodeURIComponent(visitId)}/recommendations`;

    let response: Response;

    try {
        response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${resolvedToken}`,
                'If-Match': etag,
            },
            body: JSON.stringify(command),
        });
    } catch (networkError) {
        console.error('Network request to save visit recommendations failed.', networkError);
        throw new VisitsEndpointError(SAVE_RECOMMENDATIONS_FALLBACK_MESSAGE);
    }

    if (!response.ok) {
        const errorPayload = await readErrorResponse(response);
        const serverMessage = extractMessage(errorPayload);
        const fallbackMessage = translateVisitApiMessage(serverMessage) ?? serverMessage ?? SAVE_RECOMMENDATIONS_FALLBACK_MESSAGE;
        const message = resolveSaveRecommendationsErrorMessage(
            response.status,
            fallbackMessage,
        );
        const correlationId = extractCorrelationId(errorPayload);

        console.error('Save recommendations endpoint responded with non-success status.', {
            status: response.status,
            payload: errorPayload,
        });

        throw new VisitsEndpointError(message, response.status, correlationId);
    }

    try {
        const payload = await response.json();
        return normalizeRecommendationStatePayload(payload);
    } catch (parseError) {
        console.error('Failed to parse save recommendations response payload.', parseError);
        throw new VisitsEndpointError(SAVE_RECOMMENDATIONS_FALLBACK_MESSAGE, response.status);
    }
};

/**
 * deleteVisit executes DELETE /visits/{visitId}.
 */
export const deleteVisit = async (visitId: string, token: NullableString): Promise<void> => {
    const resolvedToken = ensureToken(token, 'Brak tokenu autoryzacyjnego.');

    if (!visitId) {
        throw new VisitsEndpointError('Nieprawidłowy identyfikator wizyty.', 400);
    }

    const url = `${VISITS_ENDPOINT}/${encodeURIComponent(visitId)}`;

    let response: Response;

    try {
        response = await fetch(url, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${resolvedToken}`,
            },
        });
    } catch (networkError) {
        console.error('Network request to delete visit failed.', networkError);
        throw new VisitsEndpointError(DELETE_VISIT_FALLBACK_MESSAGE);
    }

    if (!response.ok) {
        const errorPayload = await readErrorResponse(response);
        const serverMessage = extractMessage(errorPayload);
        const fallbackMessage = translateVisitApiMessage(serverMessage) ?? serverMessage ?? DELETE_VISIT_FALLBACK_MESSAGE;
        const message = resolveGetVisitErrorMessage(
            response.status,
            fallbackMessage,
        );
        const correlationId = extractCorrelationId(errorPayload);

        console.error('Delete visit endpoint responded with non-success status.', {
            status: response.status,
            payload: errorPayload,
        });

        throw new VisitsEndpointError(message, response.status, correlationId);
    }
};
