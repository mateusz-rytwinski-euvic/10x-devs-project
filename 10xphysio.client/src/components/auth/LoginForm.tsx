import {
    Button,
    Field,
    Input,
    type InputOnChangeData,
    MessageBar,
    MessageBarActions,
    MessageBarBody,
    MessageBarTitle,
} from '@fluentui/react-components';
import type { ChangeEvent } from 'react';
import { memo, useCallback, useId } from 'react';
import { Link } from 'react-router-dom';
import { useLogin } from '../../hooks/useLogin';

interface FieldProps {
    id: string;
    value: string;
    errorMessage?: string;
    disabled: boolean;
    onChange: (value: string) => void;
}

interface SubmitButtonProps {
    disabled: boolean;
    isLoading: boolean;
    children: React.ReactNode;
}

interface ErrorMessageProps {
    message: string;
    onDismiss: () => void;
}

const EmailField = memo(({ id, value, errorMessage, disabled, onChange }: FieldProps) => {
    const handleChange = useCallback(
        (_event: ChangeEvent<HTMLInputElement>, data: InputOnChangeData) => {
            onChange(data.value ?? '');
        },
        [onChange],
    );

    return (
        <Field label="Adres e-mail" required validationState={errorMessage ? 'error' : undefined} validationMessage={errorMessage}>
            <Input
                id={id}
                type="email"
                value={value}
                onChange={handleChange}
                disabled={disabled}
                placeholder="terapeuta@example.com"
                autoComplete="email"
            />
        </Field>
    );
});

EmailField.displayName = 'EmailField';

const PasswordField = memo(({ id, value, errorMessage, disabled, onChange }: FieldProps) => {
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
                placeholder="••••••••"
                autoComplete="current-password"
            />
        </Field>
    );
});

PasswordField.displayName = 'PasswordField';

const SubmitButton = memo(({ disabled, isLoading, children }: SubmitButtonProps) => (
    <Button type="submit" appearance="primary" disabled={disabled} shape="rounded" size="large">
        {isLoading ? 'Logowanie…' : children}
    </Button>
));

SubmitButton.displayName = 'SubmitButton';

const ErrorMessage = memo(({ message, onDismiss }: ErrorMessageProps) => (
    <MessageBar intent="error" layout="multiline" aria-live="assertive">
        <MessageBarBody>
            <MessageBarTitle>Nie udało się zalogować</MessageBarTitle>
            {message}
        </MessageBarBody>
        <MessageBarActions>
            <Button appearance="subtle" onClick={onDismiss} size="small">
                Zamknij
            </Button>
        </MessageBarActions>
    </MessageBar>
));

ErrorMessage.displayName = 'ErrorMessage';

// LoginForm renders the login inputs and binds them to the useLogin hook contract.
export const LoginForm = () => {
    const { formData, errors, isLoading, handleInputChange, handleSubmit, resetErrors } = useLogin();
    const emailFieldId = useId();
    const passwordFieldId = useId();

    const onEmailChange = useCallback(
        (value: string) => {
            handleInputChange('email', value);
        },
        [handleInputChange],
    );

    const onPasswordChange = useCallback(
        (value: string) => {
            handleInputChange('password', value);
        },
        [handleInputChange],
    );

    const onDismissError = useCallback(() => {
        resetErrors();
    }, [resetErrors]);

    return (
        <section className="w-full max-w-xl rounded-3xl bg-white/95 px-6 py-8 shadow-2xl shadow-slate-900/20 backdrop-blur md:px-10 md:py-12">
            <header className="mb-8 text-center md:text-left">
                <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">Zaloguj się</h1>
                <p className="mt-2 text-sm text-slate-600 md:text-base">
                    Uzyskaj dostęp do panelu pacjentów i kontynuuj plan terapii.
                </p>
            </header>
            {errors.api ? (
                <div className="mb-6">
                    <ErrorMessage message={errors.api} onDismiss={onDismissError} />
                </div>
            ) : null}
            <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
                <EmailField
                    id={emailFieldId}
                    value={formData.email}
                    onChange={onEmailChange}
                    disabled={isLoading}
                    errorMessage={errors.email}
                />
                <PasswordField
                    id={passwordFieldId}
                    value={formData.password}
                    onChange={onPasswordChange}
                    disabled={isLoading}
                    errorMessage={errors.password}
                />
                <SubmitButton disabled={isLoading} isLoading={isLoading}>
                    Zaloguj się
                </SubmitButton>
            </form>
            <p className="mt-6 text-center text-sm text-slate-600 md:text-left">
                Nie masz jeszcze konta?{' '}
                <Link to="/signup" className="font-semibold text-sky-600 hover:text-sky-500">
                    Zarejestruj się
                </Link>
            </p>
        </section>
    );
};
