import { MessageBar, MessageBarBody, Spinner } from '@fluentui/react-components';
import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { PatientForm } from '../components/patients/form/PatientForm';
import { PatientFormActions } from '../components/patients/form/PatientFormActions';
import { PatientFormBreadcrumb } from '../components/patients/form/PatientFormBreadcrumb';
import { usePatientFormViewModel } from '../hooks/usePatientFormViewModel';
import { getPatientDetailsPath, routes } from '../routes';
import { isValidGuid } from '../utils/guid';

/**
 * PatientFormPage orchestrates patient creation and editing flows mirroring the visit form page structure.
 */
export const PatientFormPage = () => {
    const navigate = useNavigate();
    const { patientId: routePatientId } = useParams<{ patientId?: string }>();

    const sanitizedPatientId = routePatientId && isValidGuid(routePatientId) ? routePatientId : null;

    useEffect(() => {
        if (!routePatientId) {
            return;
        }

        if (sanitizedPatientId) {
            return;
        }

        navigate(routes.patients, { replace: true });
    }, [navigate, routePatientId, sanitizedPatientId]);

    const viewModel = usePatientFormViewModel(sanitizedPatientId);

    const resolvedPatientId = viewModel.patientId ?? sanitizedPatientId;

    const handleBack = useCallback(() => {
        if (resolvedPatientId && isValidGuid(resolvedPatientId)) {
            navigate(getPatientDetailsPath(resolvedPatientId));
            return;
        }

        navigate(routes.patients);
    }, [navigate, resolvedPatientId]);

    const breadcrumbName = useMemo(() => {
        const composed = `${viewModel.formData.firstName} ${viewModel.formData.lastName}`.trim();
        return composed.length > 0 ? composed : 'Pacjent';
    }, [viewModel.formData.firstName, viewModel.formData.lastName]);

    if (viewModel.isLoading) {
        return (
            <AppLayout mainClassName="flex min-h-screen items-center justify-center bg-neutral-50">
                <Spinner size="large" label="Wczytywanie pacjenta" />
            </AppLayout>
        );
    }

    return (
        <AppLayout mainClassName="bg-neutral-50 py-8">
            <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4">
                <PatientFormBreadcrumb
                    patientId={resolvedPatientId ?? null}
                    patientName={breadcrumbName}
                    isEditMode={viewModel.isEditMode}
                />

                <header className="flex flex-col gap-2">
                    <h1 className="text-3xl font-semibold text-slate-900">
                        {viewModel.isEditMode ? 'Edycja pacjenta' : 'Nowy pacjent'}
                    </h1>
                    <p className="text-base text-slate-600">
                        Uzupełnij dane demograficzne pacjenta, aby dodać go do bazy lub zaktualizować istniejący wpis.
                    </p>
                </header>

                {viewModel.error ? (
                    <MessageBar intent="error">
                        <MessageBarBody>{viewModel.error.message}</MessageBarBody>
                    </MessageBar>
                ) : null}

                <PatientForm
                    formData={viewModel.formData}
                    formErrors={viewModel.formErrors}
                    isSaving={viewModel.isSaving}
                    onFieldChange={viewModel.setFormField}
                />

                <PatientFormActions
                    onSavePatient={viewModel.handleSavePatient}
                    onBack={handleBack}
                    isSaving={viewModel.isSaving}
                    isEditMode={viewModel.isEditMode}
                />
            </section>
        </AppLayout>
    );
};
