import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ProfileEndpointError, getProfile, updateProfile } from '../services/profileService';
import type { ProfileFormData, ProfileFormErrors, ProfileSummaryDto, ProfileUpdateCommand } from '../types/profile';
import { formatPolishDateTime } from '../utils/date';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

export interface ProfileMetaViewModel {
    createdAtLabel: string;
    updatedAtLabel: string;
    fullName: string;
}

export interface UseProfileViewModelResult {
    formData: ProfileFormData;
    formErrors: ProfileFormErrors;
    meta: ProfileMetaViewModel | null;
    isLoading: boolean;
    isSaving: boolean;
    canSubmit: boolean;
    hasChanges: boolean;
    error: Error | null;
    setFormField: <TKey extends keyof ProfileFormData>(field: TKey, value: ProfileFormData[TKey]) => void;
    handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
    handleReset: () => void;
    refresh: () => void;
}

const MAX_NAME_LENGTH = 100;
const NAME_PATTERN = /^[\p{L}\- ]+$/u;
const UPDATE_PROFILE_ERROR_MESSAGE = 'Nie udało się zaktualizować profilu. Spróbuj ponownie.';

const buildInitialFormState = (overrides?: Partial<ProfileFormData>): ProfileFormData => ({
    firstName: overrides?.firstName ?? '',
    lastName: overrides?.lastName ?? '',
});

// Client-side validation mirrors backend guards so users get instant feedback before a PATCH request is issued.
const validateFormState = (state: ProfileFormData): ProfileFormErrors => {
    const errors: ProfileFormErrors = {};

    const firstName = state.firstName.trim();
    const lastName = state.lastName.trim();

    if (firstName.length === 0) {
        errors.firstName = 'Imię jest wymagane.';
    } else if (firstName.length > MAX_NAME_LENGTH) {
        errors.firstName = `Imię nie może zawierać więcej niż ${MAX_NAME_LENGTH} znaków.`;
    } else if (!NAME_PATTERN.test(firstName)) {
        errors.firstName = 'Imię może zawierać jedynie litery, spacje oraz myślnik.';
    }

    if (lastName.length === 0) {
        errors.lastName = 'Nazwisko jest wymagane.';
    } else if (lastName.length > MAX_NAME_LENGTH) {
        errors.lastName = `Nazwisko nie może zawierać więcej niż ${MAX_NAME_LENGTH} znaków.`;
    } else if (!NAME_PATTERN.test(lastName)) {
        errors.lastName = 'Nazwisko może zawierać jedynie litery, spacje oraz myślnik.';
    }

    return errors;
};

const toCommand = (formData: ProfileFormData): ProfileUpdateCommand => ({
    firstName: formData.firstName.trim(),
    lastName: formData.lastName.trim(),
});

const mergeErrors = (source: ProfileFormErrors | undefined, fallbackMessage: string): ProfileFormErrors => {
    if (!source || Object.keys(source).length === 0) {
        return { general: fallbackMessage };
    }

    if (!source.general) {
        return {
            ...source,
            general: fallbackMessage,
        };
    }

    return source;
};

const buildMeta = (profile: ProfileSummaryDto | null): ProfileMetaViewModel | null => {
    if (!profile) {
        return null;
    }

    const fullName = `${profile.firstName} ${profile.lastName}`.trim();

    return {
        createdAtLabel: formatPolishDateTime(profile.createdAt, 'Brak danych'),
        updatedAtLabel: formatPolishDateTime(profile.updatedAt, 'Brak danych'),
        fullName: fullName.length > 0 ? fullName : 'Brak danych',
    };
};

interface UpdateProfilePayload {
    command: ProfileUpdateCommand;
    etag: string;
}

/**
 * useProfileViewModel orchestrates profile fetching, optimistic concurrency, and mutation flows for the profile page.
 */
export const useProfileViewModel = (): UseProfileViewModelResult => {
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const { pushToast } = useToast();

    const [formData, setFormData] = useState<ProfileFormData>(() => buildInitialFormState());
    const [formErrors, setFormErrors] = useState<ProfileFormErrors>({});
    const [profile, setProfile] = useState<ProfileSummaryDto | null>(null);
    const [etag, setEtag] = useState<string | null>(null);

    const initialFormRef = useRef<ProfileFormData>(buildInitialFormState());

    const token = session?.accessToken ?? null;
    const profileQueryKey = useMemo(() => ['profile', session?.userId ?? 'anonymous'] as const, [session?.userId]);

    useEffect(() => {
        const resetState = buildInitialFormState();
        setProfile(null);
        setFormData(resetState);
        initialFormRef.current = resetState;
        setFormErrors({});
        setEtag(null);
    }, [session?.userId]);

    const profileQuery = useQuery<ProfileSummaryDto, ProfileEndpointError>({
        queryKey: profileQueryKey,
        enabled: Boolean(token),
        staleTime: 60_000,
        retry: (failureCount, error) => {
            if (error instanceof ProfileEndpointError && error.status === 404) {
                return false;
            }

            return failureCount < 2;
        },
        // React Query keeps the cached profile aligned with backend state and deduplicates concurrent requests.
        queryFn: () => getProfile({ token }),
    });

    useEffect(() => {
        if (!profileQuery.data) {
            return;
        }

        setProfile(profileQuery.data);
        setFormData(buildInitialFormState({
            firstName: profileQuery.data.firstName,
            lastName: profileQuery.data.lastName,
        }));
        initialFormRef.current = buildInitialFormState({
            firstName: profileQuery.data.firstName,
            lastName: profileQuery.data.lastName,
        });
        setFormErrors({});
        setEtag(profileQuery.data.eTag ?? null);
    }, [profileQuery.data]);

    const previewValidation = useMemo(() => validateFormState(formData), [formData]);

    const hasChanges = useMemo(() => {
        const initial = initialFormRef.current;
        return (
            initial.firstName.trim() !== formData.firstName.trim() ||
            initial.lastName.trim() !== formData.lastName.trim()
        );
    }, [formData.firstName, formData.lastName]);

    const mutation = useMutation<ProfileSummaryDto, ProfileEndpointError, UpdateProfilePayload>({
        mutationFn: ({ command, etag: currentEtag }) => updateProfile({ command, token, etag: currentEtag }),
        onSuccess: (updatedProfile) => {
            setProfile(updatedProfile);
            setFormData(buildInitialFormState({
                firstName: updatedProfile.firstName,
                lastName: updatedProfile.lastName,
            }));
            initialFormRef.current = buildInitialFormState({
                firstName: updatedProfile.firstName,
                lastName: updatedProfile.lastName,
            });
            setFormErrors({});
            setEtag(updatedProfile.eTag ?? null);
            queryClient.setQueryData(profileQueryKey, updatedProfile);
            pushToast({ intent: 'success', text: 'Profil został zaktualizowany.' });
        },
        onError: (error) => {
            const nextErrors = mergeErrors(error.validationErrors, error.message ?? UPDATE_PROFILE_ERROR_MESSAGE);
            setFormErrors(nextErrors);
            pushToast({ intent: 'error', text: error.message ?? UPDATE_PROFILE_ERROR_MESSAGE });
        },
    });

    const isSaving = mutation.isPending;
    const isLoading = profileQuery.isLoading && !profile;
    const error = profileQuery.error ?? null;

    const canSubmit = hasChanges && Object.keys(previewValidation).length === 0 && !isSaving && Boolean(etag);

    const setFormField = useCallback(
        <TKey extends keyof ProfileFormData>(field: TKey, value: ProfileFormData[TKey]) => {
            setFormData((previous) => ({
                ...previous,
                [field]: value,
            }));

            setFormErrors((previous) => {
                if (!previous[field] && !previous.general) {
                    return previous;
                }

                const next: ProfileFormErrors = { ...previous };

                delete next.general;
                delete next[field];

                if (Object.keys(next).length === 0) {
                    return {};
                }

                return next;
            });
        },
        [],
    );

    const handleReset = useCallback(() => {
        setFormData(buildInitialFormState(initialFormRef.current));
        setFormErrors({});
    }, []);

    const handleSubmit = useCallback(
        (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setFormErrors({});

            if (!token) {
                pushToast({ intent: 'error', text: 'Sesja wygasła. Zaloguj się ponownie.' });
                return;
            }

            if (!hasChanges) {
                setFormErrors({ general: 'Wprowadź zmiany przed zapisaniem profilu.' });
                return;
            }

            const validationErrors = validateFormState(formData);

            if (Object.keys(validationErrors).length > 0) {
                setFormErrors(validationErrors);
                return;
            }

            if (!etag) {
                setFormErrors({ general: 'Brak znacznika wersji profilu. Odśwież widok i spróbuj ponownie.' });
                pushToast({ intent: 'error', text: 'Brak znacznika ETag. Odśwież profil i spróbuj ponownie.' });
                return;
            }

            mutation.mutate({
                command: toCommand(formData),
                etag,
            });
        },
        [etag, formData, hasChanges, mutation, pushToast, token],
    );

    const refresh = useCallback(() => {
        setFormErrors({});
        void profileQuery.refetch();
    }, [profileQuery]);

    const meta = useMemo(() => buildMeta(profile), [profile]);

    return {
        formData,
        formErrors,
        meta,
        isLoading,
        isSaving,
        canSubmit,
        hasChanges,
        error,
        setFormField,
        handleSubmit,
        handleReset,
        refresh,
    };
};
