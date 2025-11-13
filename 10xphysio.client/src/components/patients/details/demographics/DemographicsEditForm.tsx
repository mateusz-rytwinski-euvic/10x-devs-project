import { Button, Field, Input } from '@fluentui/react-components';
import { memo, useCallback } from 'react';
import type { EditPatientFormState, UseEditPatientResult, ValidationErrors } from '../../../../types/patientDetails';

interface DemographicsEditFormProps {
    formState: EditPatientFormState;
    errors: ValidationErrors;
    isSaving: boolean;
    onFieldChange: UseEditPatientResult['setFieldValue'];
    onSubmit: () => void;
    onCancel: () => void;
}

const MAX_NAME_LENGTH = 100;

const toInputValue = (value: string | null | undefined): string => value ?? '';

const parseDateInput = (value: string): string | null => {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

/**
 * DemographicsEditForm is the controlled edit state for patient demographics utilizing Fluent UI form primitives.
 */
export const DemographicsEditForm = memo(
    ({ formState, errors, isSaving, onFieldChange, onSubmit, onCancel }: DemographicsEditFormProps) => {
        const handleFirstNameChange = useCallback(
            (_event: React.ChangeEvent<HTMLInputElement>, data: { value: string }) => {
                onFieldChange('firstName', data.value);
            },
            [onFieldChange],
        );

        const handleLastNameChange = useCallback(
            (_event: React.ChangeEvent<HTMLInputElement>, data: { value: string }) => {
                onFieldChange('lastName', data.value);
            },
            [onFieldChange],
        );

        const handleDateChange = useCallback(
            (_event: React.ChangeEvent<HTMLInputElement>, data: { value: string }) => {
                onFieldChange('dateOfBirth', parseDateInput(data.value));
            },
            [onFieldChange],
        );

        const disableSubmit = isSaving;

        return (
            <form
                className="flex flex-col gap-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    if (!disableSubmit) {
                        onSubmit();
                    }
                }}
            >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field
                        label="Imię"
                        required
                        validationMessage={errors.firstName}
                        validationState={errors.firstName ? 'error' : 'none'}
                    >
                        <Input
                            value={toInputValue(formState.firstName)}
                            maxLength={MAX_NAME_LENGTH}
                            onChange={handleFirstNameChange}
                        />
                    </Field>

                    <Field
                        label="Nazwisko"
                        required
                        validationMessage={errors.lastName}
                        validationState={errors.lastName ? 'error' : 'none'}
                    >
                        <Input
                            value={toInputValue(formState.lastName)}
                            maxLength={MAX_NAME_LENGTH}
                            onChange={handleLastNameChange}
                        />
                    </Field>

                    <Field
                        label="Data urodzenia"
                        validationMessage={errors.dateOfBirth}
                        validationState={errors.dateOfBirth ? 'error' : 'none'}
                    >
                        <Input
                            type="date"
                            value={toInputValue(formState.dateOfBirth)}
                            onChange={handleDateChange}
                        />
                    </Field>
                </div>

                {errors.general ? (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                        {errors.general}
                    </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                    <Button type="submit" appearance="primary" disabled={disableSubmit}>
                        Zapisz zmiany
                    </Button>
                    <Button type="button" appearance="secondary" onClick={onCancel}>
                        Anuluj
                    </Button>
                </div>
            </form>
        );
    },
);

DemographicsEditForm.displayName = 'DemographicsEditForm';
