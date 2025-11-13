import { Button, MessageBar, MessageBarBody, Spinner } from '@fluentui/react-components';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditPatient } from '../../../hooks/useEditPatient';
import { usePatientDetails } from '../../../hooks/usePatientDetails';
import { useToast } from '../../../hooks/useToast';
import { getPatientVisitCreatePath, getPatientVisitDetailsPath, routes } from '../../../routes';
import type { PatientDetailsQueryOptions } from '../../../types/patientDetails';
import { PatientDetailsLayout } from './PatientDetailsLayout';

interface PatientDetailsQueryBoundaryProps extends PatientDetailsQueryOptions {
    patientId: string;
}

/**
 * PatientDetailsQueryBoundary orchestrates the data fetching lifecycle (loading/error/success) for the patient details view,
 * wiring the query and mutation hooks together. The presentational layout will be supplied in follow-up steps.
 */
export const PatientDetailsQueryBoundary = memo(
    ({ patientId, includeVisits, visitsLimit }: PatientDetailsQueryBoundaryProps) => {
        const navigate = useNavigate();
        const [visitLimitState, setVisitLimitState] = useState<number>(visitsLimit ?? 10);
        const { pushToast, clearToasts } = useToast();

        useEffect(() => {
            if (typeof visitsLimit === 'number') {
                setVisitLimitState(visitsLimit);
            }
        }, [visitsLimit]);

        useEffect(() => {
            clearToasts();
        }, [clearToasts]);

        const { data, isLoading, isError, refetch } = usePatientDetails({
            patientId,
            includeVisits,
            visitsLimit: visitLimitState,
        });

        const editPatient = useEditPatient({
            patientId,
            etag: data?.eTag ?? '',
            initialState: {
                firstName: data?.firstName ?? '',
                lastName: data?.lastName ?? '',
                dateOfBirth: data?.dateOfBirth ?? null,
            },
            onSuccess: async () => {
                pushToast({ intent: 'success', text: 'Dane pacjenta zostały zapisane.' });
                await refetch();
            },
            onConflict: async () => {
                pushToast({ intent: 'error', text: 'Dane pacjenta uległy zmianie. Odświeżono szczegóły.' });
                await refetch();
            },
            onNotFound: () => {
                pushToast({ intent: 'error', text: 'Pacjent nie został znaleziony. Przywrócono listę pacjentów.' });
                navigate(routes.patients, { replace: true });
            },
            onUnauthorized: () => {
                pushToast({ intent: 'error', text: 'Sesja wygasła. Zaloguj się ponownie.' });
                navigate(routes.login, { replace: true });
            },
            onError: (message) => {
                pushToast({ intent: 'error', text: message });
            },
        });

        const handleRetry = useCallback(() => {
            void refetch();
        }, [refetch]);

        const handleVisitLimitChange = useCallback(
            (nextLimit: number) => {
                setVisitLimitState(nextLimit);
                pushToast({ intent: 'info', text: `Zmieniono limit wizyt na ${nextLimit}.` });
            },
            [pushToast],
        );

        const handleAddVisit = useCallback(() => {
            navigate(getPatientVisitCreatePath(patientId));
        }, [navigate, patientId]);

        const handleSelectVisit = useCallback(
            (visitId: string) => {
                navigate(getPatientVisitDetailsPath(patientId, visitId));
            },
            [navigate, patientId],
        );

        const content = useMemo(() => {
            if (isLoading) {
                return (
                    <div className="flex min-h-64 items-center justify-center">
                        <Spinner size="large" label="Ładowanie danych pacjenta" />
                    </div>
                );
            }

            if (isError || !data) {
                return (
                    <MessageBar intent="error">
                        <MessageBarBody>
                            <p className="text-sm font-semibold text-slate-900">Nie udało się pobrać danych pacjenta</p>
                            <p className="text-sm text-slate-600">
                                Spróbuj ponownie. Jeżeli problem będzie się powtarzał, skontaktuj się z pomocą techniczną.
                            </p>
                            <div className="mt-3 flex gap-2">
                                <Button appearance="primary" onClick={handleRetry}>
                                    Spróbuj ponownie
                                </Button>
                                <Button appearance="secondary" onClick={() => navigate(routes.patients)}>
                                    Wróć do listy pacjentów
                                </Button>
                            </div>
                        </MessageBarBody>
                    </MessageBar>
                );
            }

            return (
                <PatientDetailsLayout
                    patient={data}
                    editPatient={editPatient}
                    visitLimit={visitLimitState}
                    onChangeVisitLimit={handleVisitLimitChange}
                    onAddVisit={handleAddVisit}
                    onSelectVisit={handleSelectVisit}
                />
            );
        }, [
            data,
            editPatient,
            handleAddVisit,
            handleRetry,
            handleSelectVisit,
            handleVisitLimitChange,
            isError,
            isLoading,
            navigate,
            visitLimitState,
        ]);

        return (
            <div className="flex flex-col gap-4">{content}</div>
        );
    },
);

PatientDetailsQueryBoundary.displayName = 'PatientDetailsQueryBoundary';
