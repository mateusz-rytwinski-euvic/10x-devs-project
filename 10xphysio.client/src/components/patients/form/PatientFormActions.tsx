import { Button } from '@fluentui/react-components';
import { ArrowLeftRegular, Save16Regular } from '@fluentui/react-icons';
import { memo } from 'react';

interface PatientFormActionsProps {
    onSavePatient: () => void;
    onBack: () => void;
    isSaving: boolean;
    isEditMode: boolean;
}

/**
 * PatientFormActions renders the footer cta buttons for saving or leaving the patient form.
 */
const PatientFormActionsComponent = ({ onSavePatient, onBack, isSaving, isEditMode }: PatientFormActionsProps) => {
    const primaryLabel = isEditMode ? 'Zapisz zmiany' : 'Dodaj pacjenta';

    return (
        <footer className="flex flex-wrap items-center justify-end gap-3">
            <Button
                appearance="primary"
                onClick={onSavePatient}
                icon={<Save16Regular />}
                disabled={isSaving}
            >
                {primaryLabel}
            </Button>
            <Button appearance="secondary" onClick={onBack} icon={<ArrowLeftRegular />}>
                Wróć
            </Button>
        </footer>
    );
};

export const PatientFormActions = memo(PatientFormActionsComponent);

PatientFormActions.displayName = 'PatientFormActions';
