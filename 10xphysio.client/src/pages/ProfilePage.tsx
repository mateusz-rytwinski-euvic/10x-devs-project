import type { InputOnChangeData } from '@fluentui/react-components';
import { Button, Field, Input, MessageBar, MessageBarBody, MessageBarTitle, Spinner } from '@fluentui/react-components';
import { useCallback } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { useProfileViewModel } from '../hooks/useProfileViewModel';

const MAX_NAME_LENGTH = 100;

// ProfilePage surfaces authenticated therapist details and allows updating metadata via the profile API.
export const ProfilePage = () => {
    const viewModel = useProfileViewModel();

    const handleFirstNameChange = useCallback(
        (_event: unknown, data: InputOnChangeData) => {
            viewModel.setFormField('firstName', data.value ?? '');
        },
        [viewModel],
    );

    const handleLastNameChange = useCallback(
        (_event: unknown, data: InputOnChangeData) => {
            viewModel.setFormField('lastName', data.value ?? '');
        },
        [viewModel],
    );

    if (viewModel.isLoading) {
        return (
            <AppLayout mainClassName="flex min-h-screen items-center justify-center bg-neutral-50">
                <Spinner size="large" label="Wczytywanie profilu" />
            </AppLayout>
        );
    }

    return (
        <AppLayout mainClassName="bg-neutral-50 py-10">
            <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4">
                <header className="flex flex-col gap-2">
                    <h1 className="text-3xl font-semibold text-slate-900">Profil terapeuty</h1>
                    <p className="text-base text-slate-600">
                        Zarządzaj swoimi danymi oraz weryfikuj, kiedy profil był ostatnio aktualizowany.
                    </p>
                </header>

                {viewModel.error ? (
                    <MessageBar intent="error" layout="multiline">
                        <MessageBarBody>
                            <MessageBarTitle>Nie udało się załadować profilu</MessageBarTitle>
                            {viewModel.error.message}
                        </MessageBarBody>
                        <Button appearance="transparent" onClick={viewModel.refresh}>
                            Spróbuj ponownie
                        </Button>
                    </MessageBar>
                ) : null}

                <form
                    className="flex flex-col gap-6"
                    onSubmit={viewModel.handleSubmit}
                    noValidate
                >
                    <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                            <div className="flex flex-col gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                                <Field
                                    label="Imię"
                                    required
                                    validationMessage={viewModel.formErrors.firstName}
                                    validationState={viewModel.formErrors.firstName ? 'error' : 'none'}
                                >
                                    <Input
                                        value={viewModel.formData.firstName}
                                        maxLength={MAX_NAME_LENGTH}
                                        disabled={viewModel.isSaving}
                                        onChange={handleFirstNameChange}
                                        aria-required
                                    />
                                </Field>

                                <Field
                                    label="Nazwisko"
                                    required
                                    validationMessage={viewModel.formErrors.lastName}
                                    validationState={viewModel.formErrors.lastName ? 'error' : 'none'}
                                >
                                    <Input
                                        value={viewModel.formData.lastName}
                                        maxLength={MAX_NAME_LENGTH}
                                        disabled={viewModel.isSaving}
                                        onChange={handleLastNameChange}
                                        aria-required
                                    />
                                </Field>

                                {viewModel.formErrors.general ? (
                                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                                        {viewModel.formErrors.general}
                                    </div>
                                ) : null}

                                <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end">
                                    <Button
                                        type="button"
                                        appearance="secondary"
                                        onClick={viewModel.handleReset}
                                        disabled={!viewModel.hasChanges || viewModel.isSaving}
                                    >
                                        Resetuj zmiany
                                    </Button>
                                    <Button
                                        type="submit"
                                        appearance="primary"
                                        disabled={!viewModel.canSubmit || viewModel.isSaving}
                                        aria-busy={viewModel.isSaving}
                                    >
                                        {viewModel.isSaving ? 'Zapisywanie…' : 'Zapisz profil'}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <aside className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                            <span className="text-sm font-semibold uppercase tracking-wide text-[#055b6e]">
                                Podsumowanie profilu
                            </span>

                            {viewModel.meta ? (
                                <dl className="space-y-3 text-sm text-slate-600">
                                    <div className="flex items-center justify-between">
                                        <dt className="font-medium text-slate-500">Pełne imię i nazwisko</dt>
                                        <dd className="text-right font-semibold text-slate-900">
                                            {viewModel.meta.fullName}
                                        </dd>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <dt className="font-medium text-slate-500">Utworzono</dt>
                                        <dd className="text-right text-slate-900">{viewModel.meta.createdAtLabel}</dd>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <dt className="font-medium text-slate-500">Ostatnia aktualizacja</dt>
                                        <dd className="text-right text-slate-900">{viewModel.meta.updatedAtLabel}</dd>
                                    </div>
                                </dl>
                            ) : (
                                <p className="text-sm text-slate-500">Brak danych profilu.</p>
                            )}
                        </aside>
                    </section>
                </form>
            </section>
        </AppLayout>
    );
};
