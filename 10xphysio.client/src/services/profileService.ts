import type { ProfileFormErrors, ProfileSummaryDto, ProfileUpdateCommand } from '../types/profile';

// ProfileEndpointError transports HTTP metadata alongside user-friendly messages so UI layers can react accordingly.
export class ProfileEndpointError extends Error {
    public readonly status?: number;

    public readonly correlationId?: string;

    public readonly validationErrors?: ProfileFormErrors;

    constructor(message: string, status?: number, correlationId?: string, validationErrors?: ProfileFormErrors) {
        super(message);
        this.name = 'ProfileEndpointError';
        this.status = status;
        this.correlationId = correlationId;
        this.validationErrors = validationErrors;
    }
}

const PROFILE_ENDPOINT = '/api/Profile';

const GET_PROFILE_FALLBACK_MESSAGE = 'Nie udało się pobrać danych profilu. Spróbuj ponownie.';
const UPDATE_PROFILE_FALLBACK_MESSAGE = 'Nie udało się zaktualizować profilu. Spróbuj ponownie.';

interface ErrorShape {
    message?: string;
    Message?: string;
    correlationId?: string;
    CorrelationId?: string;
}

const isRecord = (candidate: unknown): candidate is Record<string, unknown> => {
    return typeof candidate === 'object' && candidate !== null;
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

const readErrorResponse = async (response: Response): Promise<ErrorShape | null> => {
    try {
        return (await response.json()) as ErrorShape;
    } catch {
        return null;
    }
};

const extractMessage = (error: ErrorShape | null): string | undefined => {
    if (!error) {
        return undefined;
    }

    const candidates: Array<unknown> = [error.message, error.Message];

    return candidates.find((candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0);
};

const extractCorrelationId = (error: ErrorShape | null): string | undefined => {
    if (!error) {
        return undefined;
    }

    const candidate = error.correlationId ?? error.CorrelationId;
    return typeof candidate === 'string' ? candidate : undefined;
};

interface ErrorInterpretation {
    message?: string;
    validationErrors?: ProfileFormErrors;
}

const mapValidationError = (field: keyof ProfileFormErrors, message: string): ProfileFormErrors => {
    if (field === 'general') {
        return { general: message };
    }

    return { [field]: message } as ProfileFormErrors;
};

const interpretErrorCode = (code: string | undefined): ErrorInterpretation => {
    if (!code) {
        return {};
    }

    const normalized = code.trim().toLowerCase();

    // The backend returns concise error codes; mapping them here keeps UI messaging centralized and reusable.
    switch (normalized) {
        case 'first_name_required':
            return {
                message: 'Imię jest wymagane.',
                validationErrors: mapValidationError('firstName', 'Imię jest wymagane.'),
            };
        case 'first_name_too_long':
            return {
                message: 'Imię nie może zawierać więcej niż 100 znaków.',
                validationErrors: mapValidationError('firstName', 'Imię nie może zawierać więcej niż 100 znaków.'),
            };
        case 'first_name_invalid':
            return {
                message: 'Imię może zawierać jedynie litery, spacje oraz myślnik.',
                validationErrors: mapValidationError('firstName', 'Imię może zawierać jedynie litery, spacje oraz myślnik.'),
            };
        case 'last_name_required':
            return {
                message: 'Nazwisko jest wymagane.',
                validationErrors: mapValidationError('lastName', 'Nazwisko jest wymagane.'),
            };
        case 'last_name_too_long':
            return {
                message: 'Nazwisko nie może zawierać więcej niż 100 znaków.',
                validationErrors: mapValidationError('lastName', 'Nazwisko nie może zawierać więcej niż 100 znaków.'),
            };
        case 'last_name_invalid':
            return {
                message: 'Nazwisko może zawierać jedynie litery, spacje oraz myślnik.',
                validationErrors: mapValidationError('lastName', 'Nazwisko może zawierać jedynie litery, spacje oraz myślnik.'),
            };
        case 'no_changes_submitted':
            return {
                message: 'Wprowadź zmiany przed zapisaniem profilu.',
                validationErrors: mapValidationError('general', 'Nie wprowadzono żadnych zmian.'),
            };
        case 'missing_if_match':
            return {
                message: 'Brak nagłówka If-Match. Odśwież widok i spróbuj ponownie.',
            };
        case 'invalid_if_match':
            return {
                message: 'Nieprawidłowy format nagłówka If-Match. Odśwież profil i spróbuj ponownie.',
            };
        case 'etag_mismatch':
            return {
                message: 'Profil został zaktualizowany w międzyczasie. Odśwież widok i spróbuj ponownie.',
            };
        case 'invalid_user_identifier':
            return {
                message: 'Nieprawidłowy identyfikator użytkownika. Zaloguj się ponownie.',
            };
        case 'invalid_token':
            return {
                message: 'Sesja wygasła. Zaloguj się ponownie.',
            };
        case 'profile_missing':
            return {
                message: 'Nie znaleziono profilu terapeuty. Skontaktuj się z administratorem.',
            };
        case 'profile_update_failed':
            return {
                message: 'Nie udało się zapisać zmian profilu. Spróbuj ponownie później.',
            };
        case 'supabase_error':
            return {
                message: 'Usługa profilu jest chwilowo niedostępna. Spróbuj ponownie.',
            };
        case 'internal_error':
            return {
                message: 'Wystąpił nieoczekiwany błąd po stronie serwera.',
            };
        default:
            return {};
    }
};

const resolveGetErrorMessage = (status: number | undefined, fallback: string): string => {
    if (status === 401) {
        return 'Sesja wygasła. Zaloguj się ponownie.';
    }

    if (status === 404) {
        return 'Profil terapeuty nie został znaleziony.';
    }

    if (status === 502) {
        return 'Serwis profilu jest chwilowo niedostępny. Spróbuj ponownie.';
    }

    return fallback;
};

const resolveUpdateErrorMessage = (status: number | undefined, fallback: string): string => {
    if (status === 400) {
        return fallback;
    }

    if (status === 401) {
        return 'Sesja wygasła. Zaloguj się ponownie.';
    }

    if (status === 404) {
        return 'Profil terapeuty nie został znaleziony.';
    }

    if (status === 409) {
        return 'Profil został zmodyfikowany przez innego użytkownika. Odśwież widok i spróbuj ponownie.';
    }

    if (status === 502) {
        return 'Serwis profilu jest chwilowo niedostępny. Spróbuj ponownie.';
    }

    return fallback;
};

const normalizeProfile = (payload: unknown): ProfileSummaryDto => {
    if (!isRecord(payload)) {
        console.error('Profile endpoint returned an unexpected payload.', payload);
        throw new ProfileEndpointError(GET_PROFILE_FALLBACK_MESSAGE);
    }

    const id = toOptionalString(payload.id ?? payload.Id);
    const firstName = toOptionalString(payload.firstName ?? payload.FirstName) ?? '';
    const lastName = toOptionalString(payload.lastName ?? payload.LastName) ?? '';
    const createdAt = toOptionalString(payload.createdAt ?? payload.CreatedAt);
    const updatedAt = toOptionalString(payload.updatedAt ?? payload.UpdatedAt);
    const eTag = toOptionalString(payload.eTag ?? payload.ETag) ?? '';

    if (!id || !createdAt || !updatedAt) {
        console.error('Profile payload is missing required fields.', payload);
        throw new ProfileEndpointError(GET_PROFILE_FALLBACK_MESSAGE);
    }

    return {
        id,
        firstName,
        lastName,
        createdAt,
        updatedAt,
        eTag,
    };
};

interface GetProfileOptions {
    token: string | null | undefined;
}

export const getProfile = async ({ token }: GetProfileOptions): Promise<ProfileSummaryDto> => {
    if (!token) {
        console.error('getProfile invoked without an access token.');
        throw new ProfileEndpointError('Brak tokenu autoryzacyjnego.', 401);
    }

    let response: Response;

    try {
        response = await fetch(PROFILE_ENDPOINT, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
    } catch (networkError) {
        console.error('Network request to fetch profile failed before reaching the server.', networkError);
        throw new ProfileEndpointError('Nie udało się połączyć z serwerem profilu.', undefined);
    }

    if (!response.ok) {
        const errorPayload = await readErrorResponse(response);
        const errorCode = extractMessage(errorPayload);
        const interpretation = interpretErrorCode(errorCode);
        const correlationId = extractCorrelationId(errorPayload);
        const message = interpretation.message
            ? interpretation.message
            : resolveGetErrorMessage(response.status, errorCode ?? GET_PROFILE_FALLBACK_MESSAGE);

        throw new ProfileEndpointError(message, response.status, correlationId, interpretation.validationErrors);
    }

    try {
        const payload = await response.json();
        const profile = normalizeProfile(payload);
        const headerEtag = response.headers.get('etag');

        if (headerEtag && headerEtag.trim().length > 0) {
            profile.eTag = headerEtag;
        }

        return profile;
    } catch (parseError) {
        console.error('Failed to parse profile response as JSON.', parseError);
        throw new ProfileEndpointError(GET_PROFILE_FALLBACK_MESSAGE, response.status);
    }
};

interface UpdateProfileOptions {
    command: ProfileUpdateCommand;
    token: string | null | undefined;
    etag: string | null | undefined;
}

export const updateProfile = async ({ command, token, etag }: UpdateProfileOptions): Promise<ProfileSummaryDto> => {
    if (!token) {
        console.error('updateProfile invoked without an access token.');
        throw new ProfileEndpointError('Brak tokenu autoryzacyjnego.', 401);
    }

    if (!etag) {
        console.error('updateProfile invoked without an ETag.');
        throw new ProfileEndpointError('Brak znacznika ETag. Odśwież profil i spróbuj ponownie.', 412);
    }

    let response: Response;

    try {
        // PATCH operations are guarded by weak ETags to mirror the server-side optimistic concurrency contract.
        response = await fetch(PROFILE_ENDPOINT, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                'If-Match': etag,
            },
            body: JSON.stringify(command),
        });
    } catch (networkError) {
        console.error('Network request to update profile failed before reaching the server.', networkError);
        throw new ProfileEndpointError('Nie udało się połączyć z serwerem profilu.', undefined);
    }

    if (!response.ok) {
        const errorPayload = await readErrorResponse(response);
        const errorCode = extractMessage(errorPayload);
        const interpretation = interpretErrorCode(errorCode);
        const correlationId = extractCorrelationId(errorPayload);
        const baseMessage = interpretation.message ?? errorCode ?? UPDATE_PROFILE_FALLBACK_MESSAGE;
        const message = interpretation.message
            ? interpretation.message
            : resolveUpdateErrorMessage(response.status, baseMessage);

        throw new ProfileEndpointError(message, response.status, correlationId, interpretation.validationErrors);
    }

    try {
        const payload = await response.json();
        const profile = normalizeProfile(payload);
        const headerEtag = response.headers.get('etag');

        if (headerEtag && headerEtag.trim().length > 0) {
            profile.eTag = headerEtag;
        }

        return profile;
    } catch (parseError) {
        console.error('Failed to parse profile update response.', parseError);
        throw new ProfileEndpointError(UPDATE_PROFILE_FALLBACK_MESSAGE, response.status);
    }
};
