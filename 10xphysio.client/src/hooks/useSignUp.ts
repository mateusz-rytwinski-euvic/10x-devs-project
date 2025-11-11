import { useMutation } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import type { AuthSignupCommand, OperationMessageDto } from '../types/auth';

interface ApiErrorShape {
    message?: string;
}

const SIGN_UP_ENDPOINT = '/api/auth/signup';

const resolveErrorMessage = (status: number | undefined, fallback: string): string => {
    if (status === 400) {
        return 'Wystąpił błąd walidacji. Sprawdź dane i spróbuj ponownie.';
    }

    if (status === 409) {
        return 'Ten adres e-mail jest już zarejestrowany. Spróbuj się zalogować.';
    }

    if (status === 502) {
        return 'Serwis chwilowo niedostępny. Spróbuj ponownie za kilka minut.';
    }

    return fallback;
};

const readErrorResponse = async (response: Response): Promise<ApiErrorShape | null> => {
    try {
        return (await response.json()) as ApiErrorShape;
    } catch {
        return null;
    }
};

interface UseSignUpResult {
    signUp: (payload: AuthSignupCommand) => void;
    isLoading: boolean;
    isSuccess: boolean;
    error: string | null;
    successMessage: string | null;
    resetError: () => void;
}

// useSignUp wraps the sign-up API call with React Query and normalises error handling for the UI layer.
export const useSignUp = (): UseSignUpResult => {
    const [apiError, setApiError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: async (payload: AuthSignupCommand): Promise<OperationMessageDto> => {
            let response: Response;

            try {
                response = await fetch(SIGN_UP_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });
            } catch (networkError) {
                console.error('Sign-up request failed before reaching the server.', networkError);
                throw new Error('Nie udało się połączyć z serwerem. Sprawdź połączenie z internetem.');
            }

            if (!response.ok) {
                const apiErrorResponse = await readErrorResponse(response);
                const fallback = apiErrorResponse?.message ?? 'Nie udało się utworzyć konta.';
                const message = resolveErrorMessage(response.status, fallback);
                throw new Error(message);
            }

            const operation = (await response.json()) as OperationMessageDto;
            setApiError(null);
            setSuccessMessage(operation.message ?? 'Konto zostało utworzone.');
            return operation;
        },
        onError: (error) => {
            console.error('Sign-up request returned an error response.', error);
            setApiError(error instanceof Error ? error.message : 'Nie udało się utworzyć konta. Spróbuj ponownie.');
            setSuccessMessage(null);
        },
        onSuccess: (operation) => {
            if (!operation.message) {
                setSuccessMessage('Konto zostało utworzone.');
            }
        },
    });

    const { mutate, isPending, isSuccess, reset } = mutation;

    const signUp = useCallback(
        (payload: AuthSignupCommand) => {
            setApiError(null);
            setSuccessMessage(null);
            mutate(payload);
        },
        [mutate],
    );

    const resetError = useCallback(() => {
        setApiError(null);
        reset();
    }, [reset]);

    return useMemo(
        () => ({
            signUp,
            isLoading: isPending,
            isSuccess,
            error: apiError,
            successMessage,
            resetError,
        }),
        [apiError, isPending, isSuccess, resetError, signUp, successMessage],
    );
};
