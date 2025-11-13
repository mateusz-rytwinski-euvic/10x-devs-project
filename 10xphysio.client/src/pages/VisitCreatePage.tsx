import { Button, Field, Input, Textarea } from '@fluentui/react-components';
import { CalendarAddRegular, DismissCircle16Regular } from '@fluentui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { useCreateVisit } from '../hooks/useCreateVisit';
import { useToast } from '../hooks/useToast';
import { getPatientDetailsPath, getPatientVisitDetailsPath, routes } from '../routes';
import type { VisitFormErrors, VisitFormState } from '../types/visit';
import { isValidGuid } from '../utils/guid';

const MAX_TEXTAREA_LENGTH = 2000;

const buildInitialFormState = (): VisitFormState => {
    const now = new Date();
    const iso = now.toISOString();

    return {
        visitDate: iso.slice(0, 10),
        visitTime: iso.slice(11, 16),
        interview: '',
        description: '',
        recommendations: '',
    };
};

const trimOrNull = (value: string): string | null => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const combineDateAndTimeToIso = (date: string, time: string): string | null => {
    if (!date) {
        return null;
    }

    const sanitizedTime = time && time.trim().length > 0 ? time : '00:00';
    const candidate = new Date(`${date}T${sanitizedTime}:00`);

    if (Number.isNaN(candidate.getTime())) {
        return null;
    }

    return candidate.toISOString();
};

const validateForm = (state: VisitFormState): VisitFormErrors => {
    const errors: VisitFormErrors = {};

    if (!state.visitDate) {
        errors.visitDate = 'Podaj datę wizyty.';
    }

    if (!state.visitTime) {
        errors.visitTime = 'Wybierz godzinę wizyty.';
    }

    if (state.description.trim().length === 0) {
        errors.description = 'Opis wizyty jest wymagany.';
    }

    if (state.recommendations.length > MAX_TEXTAREA_LENGTH) {
        errors.recommendations = `Zalecenia nie mogą przekraczać ${MAX_TEXTAREA_LENGTH} znaków.`;
    }

    return errors;
};

/**
 * VisitCreatePage renders the visit creation form and persists the payload using the visits API.
 */
export const VisitCreatePage = () => {
    const navigate = useNavigate();
    const { patientId } = useParams<{ patientId: string }>();
    const { pushToast } = useToast();
    const [formState, setFormState] = useState<VisitFormState>(() => buildInitialFormState());
    const [errors, setErrors] = useState<VisitFormErrors>({});

    useEffect(() => {
        if (isValidGuid(patientId)) {
            return;
        }

        navigate(routes.patients, { replace: true });
    }, [navigate, patientId]);

    const validPatientId = useMemo(() => (patientId && isValidGuid(patientId)) ? patientId : null, [patientId]);

    const handleBack = useCallback(() => {
        if (!validPatientId) {
            navigate(routes.patients, { replace: true });
            return;
        }

        navigate(getPatientDetailsPath(validPatientId));
    }, [navigate, validPatientId]);

    const { createVisit, isCreating, error: createError, reset } = useCreateVisit({
        patientId: validPatientId ?? '',
        onSuccess: (visit) => {
            pushToast({ intent: 'success', text: 'Wizyta została utworzona.' });
            navigate(getPatientVisitDetailsPath(visit.patientId, visit.id), { replace: true });
        },
        onError: (mutationError) => {
            const message = mutationError.message || 'Nie udało się utworzyć wizyty.';
            setErrors((previous) => ({ ...previous, general: message }));
            pushToast({ intent: 'error', text: message });
        },
    });

    useEffect(() => {
        if (!createError) {
            return;
        }

        setErrors((previous) => ({ ...previous, general: createError.message }));
    }, [createError]);

    const handleFieldChange = useCallback(
        <TKey extends keyof VisitFormState>(field: TKey, value: VisitFormState[TKey]) => {
            setFormState((previous) => ({
                ...previous,
                [field]: value,
            }));

            setErrors((previous) => ({
                ...previous,
                [field]: undefined,
                general: undefined,
            }));
        },
        [],
    );

    const handleSubmit = useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();

            const validation = validateForm(formState);

            if (Object.keys(validation).length > 0) {
                setErrors(validation);
                return;
            }

            const visitDateIso = combineDateAndTimeToIso(formState.visitDate, formState.visitTime);

            if (!visitDateIso) {
                setErrors((previous) => ({
                    ...previous,
                    visitDate: 'Nie udało się zinterpretować wybranej daty i godziny.',
                }));
                return;
            }

            try {
                reset();
                await createVisit({
                    visitDate: visitDateIso,
                    interview: trimOrNull(formState.interview),
                    description: trimOrNull(formState.description) ?? '',
                    recommendations: trimOrNull(formState.recommendations),
                });
            } catch (submissionError) {
                const message = submissionError instanceof Error
                    ? submissionError.message
                    : 'Nie udało się utworzyć wizyty. Spróbuj ponownie.';
                setErrors((previous) => ({ ...previous, general: message }));
            }
        },
        [createVisit, formState, reset],
    );

    if (!validPatientId) {
        return null;
    }

    return (
        <AppLayout mainClassName="bg-neutral-50 py-10">
            <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4">
                <header className="flex flex-col gap-2">
                    <h1 className="flex items-center gap-2 text-3xl font-semibold text-slate-900">
                        <CalendarAddRegular className="h-8 w-8" />
                        Nowa wizyta
                    </h1>
                    <p className="text-base text-slate-600">
                        Uzupełnij szczegóły spotkania i zapisz wizytę, aby pojawiła się w historii pacjenta.
                    </p>
                </header>

                <form
                    className="flex flex-col gap-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
                    onSubmit={handleSubmit}
                >
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Field
                            label="Data wizyty"
                            required
                            validationMessage={errors.visitDate}
                            validationState={errors.visitDate ? 'error' : 'none'}
                        >
                            <Input
                                type="date"
                                value={formState.visitDate}
                                onChange={(_event, data) => handleFieldChange('visitDate', data.value)}
                            />
                        </Field>

                        <Field
                            label="Godzina"
                            required
                            validationMessage={errors.visitTime}
                            validationState={errors.visitTime ? 'error' : 'none'}
                        >
                            <Input
                                type="time"
                                value={formState.visitTime}
                                onChange={(_event, data) => handleFieldChange('visitTime', data.value)}
                            />
                        </Field>
                    </div>

                    <Field label="Wywiad" hint="Opcjonalnie opisz wnioski z rozmowy.">
                        <Textarea
                            value={formState.interview}
                            maxLength={MAX_TEXTAREA_LENGTH}
                            onChange={(_event, data) => handleFieldChange('interview', data.value)}
                            resize="vertical"
                        />
                    </Field>

                    <Field
                        label="Opis wizyty"
                        required
                        validationMessage={errors.description}
                        validationState={errors.description ? 'error' : 'none'}
                    >
                        <Textarea
                            value={formState.description}
                            maxLength={MAX_TEXTAREA_LENGTH}
                            onChange={(_event, data) => handleFieldChange('description', data.value)}
                            resize="vertical"
                        />
                    </Field>

                    <Field
                        label="Zalecenia dla pacjenta"
                        validationMessage={errors.recommendations}
                        validationState={errors.recommendations ? 'error' : 'none'}
                        hint="Pole opcjonalne – uzupełnij, jeśli chcesz przekazać dodatkowe zalecenia."
                    >
                        <Textarea
                            value={formState.recommendations}
                            maxLength={MAX_TEXTAREA_LENGTH}
                            onChange={(_event, data) => handleFieldChange('recommendations', data.value)}
                            resize="vertical"
                        />
                    </Field>

                    {errors.general ? (
                        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                            <DismissCircle16Regular />
                            <span>{errors.general}</span>
                        </div>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-3">
                        <Button appearance="primary" type="submit" disabled={isCreating}>
                            Zapisz wizytę
                        </Button>
                        <Button appearance="secondary" type="button" onClick={handleBack}>
                            Anuluj
                        </Button>
                    </div>
                </form>
            </section>
        </AppLayout>
    );
};
