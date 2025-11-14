import { Button } from '@fluentui/react-components';
import { ArrowLeftRegular, Delete16Regular, Save16Regular } from '@fluentui/react-icons';

interface FormActionButtonsProps {
    onSaveVisit: () => void;
    onSaveRecommendations: () => void;
    onDeleteVisit?: () => void;
    isSaving: boolean;
    isEditMode: boolean;
    onBack?: () => void;
    backButtonLabel?: string;
}

/**
 * FormActionButtons exposes primary and secondary actions for the visit form.
 */
export const FormActionButtons = ({
    onSaveVisit,
    onSaveRecommendations,
    onDeleteVisit,
    isSaving,
    isEditMode,
    onBack,
    backButtonLabel,
}: FormActionButtonsProps) => {
    const resolvedBackLabel = backButtonLabel ?? 'Wróć';

    return (
        <div className="flex flex-wrap justify-end gap-3">
            <Button appearance="primary" icon={<Save16Regular />} onClick={onSaveVisit} disabled={isSaving}>
                Zapisz wizytę
            </Button>
            <Button appearance="secondary" onClick={onSaveRecommendations} disabled={isSaving || !isEditMode}>
                Zapisz zalecenia
            </Button>
            {isEditMode && onDeleteVisit ? (
                <Button appearance="outline" icon={<Delete16Regular />} onClick={onDeleteVisit} disabled={isSaving}>
                    Usuń wizytę
                </Button>
            ) : null}
            {onBack ? (
                <Button appearance="secondary" icon={<ArrowLeftRegular />} onClick={onBack}>
                    {resolvedBackLabel}
                </Button>
            ) : null}
        </div>
    );
};
