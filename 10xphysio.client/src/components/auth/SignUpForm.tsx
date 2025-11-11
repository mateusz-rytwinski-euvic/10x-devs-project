
import {
    Button,
    Field,
    Input,
    type InputOnChangeData,
    MessageBar,
    MessageBarActions,
    MessageBarBody,
    MessageBarTitle,
    Spinner,
} from '@fluentui/react-components';
import type { ChangeEvent, FormEvent } from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState, useId } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useSignUp } from '../../hooks/useSignUp';
import type { AuthSignupCommand, SignUpFormErrors, SignUpFormViewModel } from '../../types/auth';

const signUpSchema = z.object({
    firstName: z
        .string({ required_error: 'Imię jest wymagane.' })
        .min(1, 'Imię jest wymagane.')
        .max(80, 'Imię może mieć maksymalnie 80 znaków.'),
    lastName: z
        .string({ required_error: 'Nazwisko jest wymagane.' })
        .min(1, 'Nazwisko jest wymagane.')
        .max(120, 'Nazwisko może mieć maksymalnie 120 znaków.'),
    email: z
        .string({ required_error: 'Adres e-mail jest wymagany.' })
        .min(1, 'Adres e-mail jest wymagany.')
        .email('Podaj poprawny adres e-mail.'),
    password: z
        .string({ required_error: 'Hasło jest wymagane.' })
        .min(8, 'Hasło musi mieć co najmniej 8 znaków.')
        .regex(/^(?=.*[A-Z])(?=.*\d).{8,}$/, 'Hasło musi zawierać wielką literę oraz cyfrę.'),
});

interface TextFieldProps {
    id: string;
    label: string;
    placeholder: string;
    autoComplete?: string;
    value: string;
    errorMessage?: string;
    disabled: boolean;
    onChange: (value: string) => void;
}

const FormField = memo(({ id, label, placeholder, autoComplete, value, errorMessage, disabled, onChange }: TextFieldProps) => {
    const handleChange = useCallback(
        (_event: ChangeEvent<HTMLInputElement>, data: InputOnChangeData) => {
            onChange(data.value ?? '');
        },
        [onChange],
    );

    return (
        <Field label={label} required validationState={errorMessage ? 'error' : undefined} validationMessage={errorMessage}>
            <Input
                id={id}
                value={value}
                onChange={handleChange}
                disabled={disabled}
                placeholder={placeholder}
                autoComplete={autoComplete}
            />
        </Field>
    );
});

FormField.displayName = 'FormField';

const PasswordField = memo(({ id, value, disabled, errorMessage, onChange }: {
    id: string;
    value: string;
    disabled: boolean;
    errorMessage?: string;
    onChange: (value: string) => void;
}) => {
    const handleChange = useCallback(
        (_event: ChangeEvent<HTMLInputElement>, data: InputOnChangeData) => {
            onChange(data.value ?? '');
        },
        [onChange],
    );

    return (
        <Field label="Hasło" required validationState={errorMessage ? 'error' : undefined} validationMessage={errorMessage}>
            <Input
                id={id}
                type="password"
                value={value}
                onChange={handleChange}
                disabled={disabled}
                placeholder="Wprowadź silne hasło"
                autoComplete="new-password"
            />
        </Field>
    );
});

PasswordField.displayName = 'PasswordField';

const ErrorMessageBar = memo(({ message, onDismiss }: { message: string; onDismiss: () => void }) => (
    <MessageBar intent="error" layout="multiline" className="w-full" aria-live="assertive">
        <MessageBarBody>
            <MessageBarTitle>Rejestracja nie powiodła się</MessageBarTitle>
            {message}
        </MessageBarBody>
        <MessageBarActions>
            <Button appearance="subtle" size="small" onClick={onDismiss}>
                Zamknij
            </Button>
        </MessageBarActions>
    </MessageBar>
));

ErrorMessageBar.displayName = 'ErrorMessageBar';

const SuccessMessageBar = memo(({ message }: { message: string }) => (
    <MessageBar intent="success" layout="multiline" className="w-full" aria-live="polite">
        <MessageBarBody>
            <MessageBarTitle>Rejestracja zakończona pomyślnie</MessageBarTitle>
            {message}
        </MessageBarBody>
    </MessageBar>
));

SuccessMessageBar.displayName = 'SuccessMessageBar';

const SubmitButton = memo(({ disabled, isLoading }: { disabled: boolean; isLoading: boolean }) => (
    <Button type="submit" appearance="primary" disabled={disabled} size="large" shape="rounded">
        {isLoading ? (
            <span className="flex items-center gap-2">
                <Spinner size="tiny" />
                Rejestrowanie…
            </span>
        ) : (
            'Załóż konto'
        )}
    </Button>
));

SubmitButton.displayName = 'SubmitButton';

const INITIAL_FORM_DATA: SignUpFormViewModel = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
};

const INITIAL_ERRORS: SignUpFormErrors = {};

// SignUpForm renders the sign-up experience, handling field state and validation before delegating submission to useSignUp.
export const SignUpForm = () => {
    const [formData, setFormData] = useState<SignUpFormViewModel>(INITIAL_FORM_DATA);
    const [errors, setErrors] = useState<SignUpFormErrors>(INITIAL_ERRORS);

    const { signUp, isLoading, isSuccess, error: apiError, successMessage, resetError } = useSignUp();
    const navigate = useNavigate();

    const firstNameFieldId = useId();
    const lastNameFieldId = useId();
    const emailFieldId = useId();
    const passwordFieldId = useId();
    const redirectTimeoutRef = useRef<number | null>(null);
    const [visibleSuccessMessage, setVisibleSuccessMessage] = useState<string | null>(null);

    const handleFieldChange = useCallback(
        (field: keyof SignUpFormViewModel, value: string) => {
            setFormData((previous) => ({
                ...previous,
                [field]: value,
            }));

            setErrors((previous) => ({
                ...previous,
                [field]: undefined,
            }));

            resetError();
        },
        [resetError],
    );

    const clearApiError = useCallback(() => {
        resetError();
        setErrors((previous) => ({
            ...previous,
            api: undefined,
        }));
    }, [resetError]);

    const resetFieldErrors = useCallback(() => {
        setErrors((previous) => ({
            ...previous,
            firstName: undefined,
            lastName: undefined,
            email: undefined,
            password: undefined,
        }));
    }, []);

    const handleSubmit = useCallback(
        (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();

            if (isLoading) {
                return;
            }

            resetFieldErrors();
            resetError();

            const validation = signUpSchema.safeParse(formData);

            if (!validation.success) {
                const nextErrors: SignUpFormErrors = {};

                for (const issue of validation.error.issues) {
                    if (issue.path.includes('firstName')) {
                        nextErrors.firstName = issue.message;
                    }
                    if (issue.path.includes('lastName')) {
                        nextErrors.lastName = issue.message;
                    }
                    if (issue.path.includes('email')) {
                        nextErrors.email = issue.message;
                    }
                    if (issue.path.includes('password')) {
                        nextErrors.password = issue.message;
                    }
                }

                setErrors((previous) => ({
                    ...previous,
                    ...nextErrors,
                }));
                return;
            }

            const payload: AuthSignupCommand = validation.data;
            signUp(payload);
        },
        [formData, isLoading, resetError, resetFieldErrors, signUp],
    );

    const isFormIncomplete = useMemo(() => {
        return (
            formData.firstName.trim() === '' ||
            formData.lastName.trim() === '' ||
            formData.email.trim() === '' ||
            formData.password.trim() === ''
        );
    }, [formData.email, formData.firstName, formData.lastName, formData.password]);

    const isFormLocked = isLoading || isSuccess;
    const isSubmitDisabled = isFormIncomplete || isFormLocked;

    useEffect(() => {
        setVisibleSuccessMessage(successMessage);
    }, [successMessage]);

    useEffect(() => {
        if (!isSuccess) {
            if (redirectTimeoutRef.current !== null) {
                window.clearTimeout(redirectTimeoutRef.current);
                redirectTimeoutRef.current = null;
            }
            return;
        }

        const timeoutId = window.setTimeout(() => {
            navigate('/patients', { replace: true });
        }, 2000);

        redirectTimeoutRef.current = timeoutId;

        return () => {
            window.clearTimeout(timeoutId);
            redirectTimeoutRef.current = null;
        };
    }, [isSuccess, navigate]);

    useEffect(() => {
        const nextApiError = apiError ?? undefined;

        setErrors((previous) => {
            if (previous.api === nextApiError) {
                return previous;
            }

            return {
                ...previous,
                api: nextApiError,
            };
        });
    }, [apiError]);

    return (
        <section className="w-full max-w-xl rounded-3xl bg-white/95 px-6 py-8 shadow-2xl shadow-slate-900/20 backdrop-blur md:px-10 md:py-12">
            <header className="mb-8 text-center md:text-left">
                <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">Załóż konto</h1>
                <p className="mt-2 text-sm text-slate-600 md:text-base">
                    Stwórz konto terapeuty i zacznij prowadzić pacjentów.
                </p>
            </header>

            {visibleSuccessMessage ? (
                <div className="mb-6">
                    <SuccessMessageBar message={visibleSuccessMessage} />
                </div>
            ) : null}
            {errors.api ? (
                <div className="mb-6">
                    <ErrorMessageBar message={errors.api} onDismiss={clearApiError} />
                </div>
            ) : null}

            <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField
                        id={firstNameFieldId}
                        label="Imię"
                        placeholder="Anna"
                        autoComplete="given-name"
                        value={formData.firstName}
                        onChange={(value) => handleFieldChange('firstName', value)}
                        disabled={isFormLocked}
                        errorMessage={errors.firstName}
                    />
                    <FormField
                        id={lastNameFieldId}
                        label="Nazwisko"
                        placeholder="Nowak"
                        autoComplete="family-name"
                        value={formData.lastName}
                        onChange={(value) => handleFieldChange('lastName', value)}
                        disabled={isFormLocked}
                        errorMessage={errors.lastName}
                    />
                </div>

                <FormField
                    id={emailFieldId}
                    label="Adres e-mail"
                    placeholder="terapeuta@example.com"
                    autoComplete="email"
                    value={formData.email}
                    onChange={(value) => handleFieldChange('email', value)}
                    disabled={isFormLocked}
                    errorMessage={errors.email}
                />

                <PasswordField
                    id={passwordFieldId}
                    value={formData.password}
                    onChange={(value) => handleFieldChange('password', value)}
                    disabled={isFormLocked}
                    errorMessage={errors.password}
                />

                <p className="text-xs text-slate-500">
                    Hasło musi składać się z minimum 8 znaków oraz zawierać co najmniej jedną wielką literę i jedną cyfrę.
                </p>

                <SubmitButton disabled={isSubmitDisabled} isLoading={isLoading} />
            </form>
            <p className="mt-6 text-center text-sm text-slate-600 md:text-left">
                Masz już konto?{' '}
                <Link to="/login" className="font-semibold text-sky-600 hover:text-sky-500">
                    Zaloguj się
                </Link>
            </p>
        </section>
    );
};
