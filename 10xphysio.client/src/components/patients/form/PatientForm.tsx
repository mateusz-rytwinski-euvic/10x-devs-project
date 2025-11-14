import type { InputOnChangeData } from '@fluentui/react-components';
import { Field, Input } from '@fluentui/react-components';
import { memo, useCallback } from 'react';
import type { PatientFormData, PatientFormErrors } from '../../../types/patientForm';

interface PatientFormProps {
    formData: PatientFormData;
    formErrors: PatientFormErrors;
    isSaving: boolean;
    onFieldChange: <TKey extends keyof PatientFormData>(field: TKey, value: PatientFormData[TKey]) => void;
}

const MAX_NAME_LENGTH = 100;

const toInputValue = (value: string | null | undefined): string => value ?? '';

/**
 * PatientForm renders the demographic inputs for patient create/edit scenarios.
 */
const PatientFormComponent = ({ formData, formErrors, isSaving, onFieldChange }: PatientFormProps) => {
    const handleFirstNameChange = useCallback(
        (_event: unknown, data: InputOnChangeData) => {
            onFieldChange('firstName', data.value ?? '');
        },
        [onFieldChange],
    );

    const handleLastNameChange = useCallback(
        (_event: unknown, data: InputOnChangeData) => {
            onFieldChange('lastName', data.value ?? '');
        },
        [onFieldChange],
    );

    const handleDateChange = useCallback(
        (_event: unknown, data: InputOnChangeData) => {
            const next = data.value ?? '';
            onFieldChange('dateOfBirth', next.length > 0 ? next : null);
        },
        [onFieldChange],
    );

    return (
        <section className="flex flex-col gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Field
                    label="Imię"
                    required
                    validationMessage={formErrors.firstName}
                    validationState={formErrors.firstName ? 'error' : 'none'}
                >
                    <Input
                        value={toInputValue(formData.firstName)}
                        maxLength={MAX_NAME_LENGTH}
                        disabled={isSaving}
                        onChange={handleFirstNameChange}
                        aria-required
                    />
                </Field>

                <Field
                    label="Nazwisko"
                    required
                    validationMessage={formErrors.lastName}
                    validationState={formErrors.lastName ? 'error' : 'none'}
                >
                    <Input
                        value={toInputValue(formData.lastName)}
                        maxLength={MAX_NAME_LENGTH}
                        disabled={isSaving}
                        onChange={handleLastNameChange}
                        aria-required
                    />
                </Field>

                <Field
                    label="Data urodzenia"
                    hint="Pole opcjonalne. Użyj formatu RRRR-MM-DD."
                    validationMessage={formErrors.dateOfBirth}
                    validationState={formErrors.dateOfBirth ? 'error' : 'none'}
                >
                    <Input
                        type="date"
                        value={toInputValue(formData.dateOfBirth)}
                        disabled={isSaving}
                        onChange={handleDateChange}
                    />
                </Field>
            </div>

            {formErrors.general ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                    {formErrors.general}
                </div>
            ) : null}
        </section>
    );
};

export const PatientForm = memo(PatientFormComponent);

PatientForm.displayName = 'PatientForm';
