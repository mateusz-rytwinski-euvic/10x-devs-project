import { Badge, Button, MessageBar, MessageBarBody, Spinner } from '@fluentui/react-components';
import { ArrowLeftRegular, ClipboardTaskListLtrRegular, ClockRegular, EditRegular } from '@fluentui/react-icons';
import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { useToast } from '../hooks/useToast';
import { useVisitDetails } from '../hooks/useVisitDetails';
import { getPatientDetailsPath, getPatientVisitDetailsPath, getPatientVisitFormPath, routes } from '../routes';
import { isValidGuid } from '../utils/guid';

const renderTextBlock = (title: string, content: string | null | undefined) => {
    return (
        <section className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
            <p className="whitespace-pre-line rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                {content && content.trim().length > 0 ? content : 'Brak danych'}
            </p>
        </section>
    );
};

/**
 * VisitDetailsPage renders visit metadata using the visits API and highlights concurrency details.
 */
export const VisitDetailsPage = () => {
    const navigate = useNavigate();
    const { patientId, visitId } = useParams<{ patientId: string; visitId: string }>();
    const { pushToast } = useToast();

    useEffect(() => {
        if (isValidGuid(patientId) && isValidGuid(visitId)) {
            return;
        }

        navigate(routes.patients, { replace: true });
    }, [navigate, patientId, visitId]);

    const visitQuery = useVisitDetails(visitId ?? '');

    useEffect(() => {
        if (!visitQuery.data || !patientId) {
            return;
        }

        if (visitQuery.data.patientId.toLowerCase() === patientId.toLowerCase()) {
            return;
        }

        navigate(getPatientVisitDetailsPath(visitQuery.data.patientId, visitQuery.data.id), { replace: true });
    }, [navigate, patientId, visitQuery.data]);

    useEffect(() => {
        if (!visitQuery.isError) {
            return;
        }

        pushToast({ intent: 'error', text: 'Nie udało się pobrać szczegółów wizyty.' });
    }, [pushToast, visitQuery.isError]);

    const handleBack = useCallback(() => {
        if (patientId && isValidGuid(patientId)) {
            navigate(getPatientDetailsPath(patientId));
            return;
        }

        navigate(routes.patients);
    }, [navigate, patientId]);

    const handleRetry = useCallback(() => {
        void visitQuery.refetch();
    }, [visitQuery]);

    const resolvedPatientId = visitQuery.data?.patientId ?? patientId ?? null;
    const resolvedVisitId = visitQuery.data?.id ?? visitId ?? null;

    const handleEdit = useCallback(() => {
        if (!resolvedPatientId || !isValidGuid(resolvedPatientId) || !resolvedVisitId) {
            pushToast({ intent: 'error', text: 'Nie udało się przejść do edycji wizyty.' });
            return;
        }

        navigate(getPatientVisitFormPath(resolvedPatientId, resolvedVisitId));
    }, [navigate, pushToast, resolvedPatientId, resolvedVisitId]);

    const content = useMemo(() => {
        if (visitQuery.isLoading) {
            return (
                <div className="flex min-h-64 items-center justify-center">
                    <Spinner label="Ładowanie szczegółów wizyty" size="large" />
                </div>
            );
        }

        if (visitQuery.isError || !visitQuery.data) {
            return (
                <MessageBar intent="error">
                    <MessageBarBody>
                        <p className="text-sm font-semibold text-slate-900">Nie udało się pobrać szczegółów wizyty.</p>
                        <p className="text-sm text-slate-600">
                            Spróbuj ponownie. Jeśli problem będzie się powtarzał, skontaktuj się z pomocą techniczną.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Button appearance="primary" onClick={handleRetry}>
                                Spróbuj ponownie
                            </Button>
                            <Button appearance="secondary" onClick={handleBack}>
                                Wróć do pacjenta
                            </Button>
                        </div>
                    </MessageBarBody>
                </MessageBar>
            );
        }

        const visit = visitQuery.data;

        return (
            <div className="flex flex-col gap-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-1">
                    <h1 className="flex items-center gap-2 text-3xl font-semibold text-slate-900">
                        <ClipboardTaskListLtrRegular className="h-7 w-7" />
                        Wizyta z {visit.visitDateLabel}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                            <ClockRegular className="h-4 w-4" />
                            {visit.visitTimeLabel}
                        </span>
                        <span>ID wizyty: </span>
                        <code className="rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">{visit.id}</code>
                    </div>
                </div>

                <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-1 rounded-md border border-slate-200 p-3">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data utworzenia</dt>
                        <dd className="text-sm text-slate-800">{visit.createdAtLabel}</dd>
                    </div>
                    <div className="flex flex-col gap-1 rounded-md border border-slate-200 p-3">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ostatnia aktualizacja</dt>
                        <dd className="text-sm text-slate-800">{visit.updatedAtLabel}</dd>
                    </div>
                    {visit.recommendationsGeneratedAtLabel ? (
                        <div className="flex flex-col gap-1 rounded-md border border-slate-200 p-3">
                            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Zalecenia wygenerowane
                            </dt>
                            <dd className="text-sm text-slate-800">{visit.recommendationsGeneratedAtLabel}</dd>
                        </div>
                    ) : null}
                    {visit.aiGenerationCountLabel ? (
                        <div className="flex flex-col gap-1 rounded-md border border-slate-200 p-3">
                            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Wsparcie AI
                            </dt>
                            <dd className="flex items-center gap-2 text-sm text-slate-800">
                                <Badge appearance="outline" color="brand">
                                    {visit.aiGenerationCountLabel}
                                </Badge>
                                {visit.recommendationsGeneratedByAi ? 'Zalecenia pochodzą z AI.' : 'Zalecenia przygotowane ręcznie.'}
                            </dd>
                        </div>
                    ) : null}
                </dl>

                <div className="flex flex-col gap-5">
                    {renderTextBlock('Wywiad', visit.interview)}
                    {renderTextBlock('Opis wizyty', visit.description)}
                    {renderTextBlock('Zalecenia', visit.recommendations)}
                </div>

                {visit.latestAiGenerationId ? (
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                        Powiązana generacja AI: {' '}
                        <code className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-700">{visit.latestAiGenerationId}</code>
                    </div>
                ) : null}

                <div className="flex flex-wrap justify-end gap-3">
                    <Button appearance="primary" icon={<EditRegular />} onClick={handleEdit}>
                        Edytuj wizytę
                    </Button>
                    <Button appearance="secondary" icon={<ArrowLeftRegular />} onClick={handleBack}>
                        Wróć do pacjenta
                    </Button>
                </div>
            </div>
        );
    }, [handleBack, handleEdit, handleRetry, visitQuery.data, visitQuery.isError, visitQuery.isLoading]);

    return (
        <AppLayout mainClassName="bg-neutral-50 py-10">
            <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4">
                {content}
            </section>
        </AppLayout>
    );
};
