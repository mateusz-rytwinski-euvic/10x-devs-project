import { memo } from 'react';
import type { PatientDetailsViewModel, UseEditPatientResult } from '../../../../types/patientDetails';
import { DemographicsEditForm } from './DemographicsEditForm';
import { DemographicsReadView } from './DemographicsReadView';

interface PatientDemographicsPanelProps {
    patient: PatientDetailsViewModel;
    editPatient: UseEditPatientResult;
}

/**
 * PatientDemographicsPanel toggles between read-only and edit modes for patient demographic data.
 */
export const PatientDemographicsPanel = memo(({ patient, editPatient }: PatientDemographicsPanelProps) => {
    if (editPatient.editing) {
        return (
            <DemographicsEditForm
                formState={editPatient.formState}
                errors={editPatient.errors}
                isSaving={editPatient.isSaving}
                onFieldChange={editPatient.setFieldValue}
                onSubmit={() => {
                    void editPatient.submit(editPatient.formState);
                }}
                onCancel={editPatient.cancel}
            />
        );
    }

    return <DemographicsReadView patient={patient} onEdit={editPatient.start} />;
});

PatientDemographicsPanel.displayName = 'PatientDemographicsPanel';
