import { MessageBar, MessageBarBody, Spinner } from '@fluentui/react-components';
import { useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { BreadcrumbNavigation } from '../components/visits/BreadcrumbNavigation';
import { FormActionButtons } from '../components/visits/FormActionButtons';
import { VisitForm } from '../components/visits/VisitForm';
import { useVisitFormViewModel } from '../hooks/useVisitFormViewModel';
import { getPatientDetailsPath, routes } from '../routes';
import { isValidGuid } from '../utils/guid';

/**
 * VisitFormPage orchestrates visit creation and editing flows.
 */
export const VisitFormPage = () => {
    const navigate = useNavigate();
    const { patientId: routePatientId, visitId: routeVisitId } = useParams<{ patientId?: string; visitId?: string }>();

    const sanitizedPatientId = routePatientId && isValidGuid(routePatientId) ? routePatientId : null;
    const sanitizedVisitId = routeVisitId && isValidGuid(routeVisitId) ? routeVisitId : null;

    useEffect(() => {
        if (!routeVisitId) {
            return;
        }

        if (sanitizedVisitId) {
            return;
        }

        navigate(routes.patients, { replace: true });
    }, [navigate, routeVisitId, sanitizedVisitId]);

    useEffect(() => {
        if (routeVisitId) {
            return;
        }

        if (sanitizedPatientId) {
            return;
        }

        navigate(routes.patients, { replace: true });
    }, [navigate, routeVisitId, sanitizedPatientId]);

    const viewModel = useVisitFormViewModel(sanitizedPatientId, sanitizedVisitId);

    const handleBack = useCallback(() => {
        const destinationPatientId = viewModel.patientId ?? sanitizedPatientId;

        if (destinationPatientId && isValidGuid(destinationPatientId)) {
            navigate(getPatientDetailsPath(destinationPatientId));
            return;
        }

        navigate(routes.patients);
    }, [navigate, sanitizedPatientId, viewModel.patientId]);

    if (viewModel.isLoading) {
        return (
            <AppLayout mainClassName="flex min-h-screen items-center justify-center bg-neutral-50">
                <Spinner size="large" label="Wczytywanie wizyty" />
            </AppLayout>
        );
    }

    return (
        <AppLayout mainClassName="bg-neutral-50 py-8">
            <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4">
                <BreadcrumbNavigation
                    patientId={viewModel.patientId}
                    visitId={sanitizedVisitId}
                    isEditMode={viewModel.isEditMode}
                />

                <header className="flex flex-col gap-2">
                    <h1 className="text-3xl font-semibold text-slate-900">
                        {sanitizedVisitId ? 'Edycja wizyty' : 'Nowa wizyta'}
                    </h1>
                    <p className="text-base text-slate-600">
                        Uzupełnij opis spotkania, wygeneruj zalecenia i zapisz wizytę w historii pacjenta.
                    </p>
                </header>

                {viewModel.error ? (
                    <MessageBar intent="error">
                        <MessageBarBody>{viewModel.error.message}</MessageBarBody>
                    </MessageBar>
                ) : null}

                <VisitForm
                    formData={viewModel.formData}
                    onFieldChange={viewModel.setFormField}
                    isGenerating={viewModel.isGenerating}
                    isSaving={viewModel.isSaving}
                    onGenerate={viewModel.handleGenerateRecommendations}
                    isEditMode={viewModel.isEditMode}
                    recommendationsGeneratedByAi={viewModel.recommendationsGeneratedByAi}
                />

                <FormActionButtons
                    onSaveVisit={viewModel.handleSaveVisit}
                    onSaveRecommendations={viewModel.handleSaveRecommendations}
                    onDeleteVisit={viewModel.isEditMode ? viewModel.handleDeleteVisit : undefined}
                    isSaving={viewModel.isSaving}
                    isEditMode={viewModel.isEditMode}
                    onBack={handleBack}
                />
            </section>
        </AppLayout>
    );
};
