import { useMutation } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import type { AuthLoginCommand, AuthSessionDto, LoginFormErrors, LoginViewModel } from '../types/auth';
import { useAuth } from './useAuth';

const loginSchema = z.object({
    email: z
        .string({ required_error: 'Adres e-mail jest wymagany.' })
        .min(1, 'Adres e-mail jest wymagany.')
        .email('Podaj poprawny adres e-mail.'),
    password: z
        .string({ required_error: 'Hasło jest wymagane.' })
        .min(1, 'Hasło jest wymagane.'),
});

interface UseLoginResult {
    formData: LoginViewModel;
    errors: LoginFormErrors;
    isLoading: boolean;
    handleInputChange: (field: keyof LoginViewModel, value: string) => void;
    handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
    resetErrors: () => void;
}

interface ApiErrorShape {
    message?: string;
}

const LOGIN_ENDPOINT = '/api/auth/login';

const resolveErrorMessage = (status: number | undefined, fallback: string): string => {
    if (status === 400) {
        return 'Wystąpił błąd podczas wysyłania formularza. Sprawdź dane i spróbuj ponownie.';
    }

    if (status === 401) {
        return 'Nieprawidłowy adres e-mail lub hasło.';
    }

    if (status === 502) {
        return 'Usługa tymczasowo niedostępna. Spróbuj ponownie za kilka minut.';
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

// useLogin orchestrates client-side validation (via Zod) and executes the authentication request using React Query's mutation utilities.
export const useLogin = (): UseLoginResult => {
    const [formData, setFormData] = useState<LoginViewModel>({ email: '', password: '' });
    const [errors, setErrors] = useState<LoginFormErrors>({});
    const { login } = useAuth();
    const navigate = useNavigate();

    const mutation = useMutation({
        mutationFn: async (payload: AuthLoginCommand): Promise<AuthSessionDto> => {
            let response: Response;

            try {
                response = await fetch(LOGIN_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });
            } catch (networkError) {
                console.error('Login request failed before reaching the server.', networkError);
                throw new Error('Nie udało się połączyć z serwerem. Sprawdź połączenie z internetem.');
            }

            if (!response.ok) {
                const apiError = await readErrorResponse(response);
                const fallback = apiError?.message ?? 'Wystąpił nieznany błąd podczas logowania.';
                const message = resolveErrorMessage(response.status, fallback);
                const error = new Error(message);
                error.name = 'LoginRequestError';
                throw error;
            }

            return (await response.json()) as AuthSessionDto;
        },
        onSuccess: (session) => {
            login(session);
            navigate('/patients', { replace: true });
        },
        onError: (error) => {
            console.error('Login request failed with an API error.', error);
            setErrors((previous) => ({
                ...previous,
                api: error instanceof Error ? error.message : 'Nie udało się zalogować. Spróbuj ponownie.',
            }));
        },
    });

    const { mutate, isPending, reset } = mutation;

    const handleInputChange = useCallback((field: keyof LoginViewModel, value: string) => {
        setFormData((previous) => ({
            ...previous,
            [field]: value,
        }));

        setErrors((previous) => ({
            ...previous,
            [field]: undefined,
            api: field === 'email' || field === 'password' ? undefined : previous.api,
        }));
    }, []);

    const resetErrors = useCallback(() => {
        reset();
        setErrors({});
    }, [reset]);

    const handleSubmit = useCallback(
        (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            resetErrors();

            if (isPending) {
                return;
            }

            const validation = loginSchema.safeParse(formData);

            if (!validation.success) {
                const nextErrors: LoginFormErrors = {};

                for (const issue of validation.error.issues) {
                    if (issue.path.includes('email')) {
                        nextErrors.email = issue.message;
                    }
                    if (issue.path.includes('password')) {
                        nextErrors.password = issue.message;
                    }
                }

                setErrors(nextErrors);
                return;
            }

            mutate(validation.data);
        },
        [formData, isPending, mutate, resetErrors],
    );

    return useMemo(
        () => ({
            formData,
            errors,
            isLoading: isPending,
            handleInputChange,
            handleSubmit,
            resetErrors,
        }),
        [errors, formData, handleInputChange, handleSubmit, isPending, resetErrors],
    );
};
