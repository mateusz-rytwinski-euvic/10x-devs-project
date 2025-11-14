import { memo } from 'react';
import type { VisitFormData } from '../../types/visit';
import { AiGenerationSection } from './AiGenerationSection';
import { RecommendationsField } from './RecommendationsField';
import { VisitDatePicker } from './VisitDatePicker';
import { VisitDescriptionField } from './VisitDescriptionField';
import { VisitInterviewField } from './VisitInterviewField';

interface VisitFormProps {
    formData: VisitFormData;
    onFieldChange: <TKey extends keyof VisitFormData>(field: TKey, value: VisitFormData[TKey]) => void;
    isGenerating: boolean;
    isSaving: boolean;
    onGenerate: () => void;
    isEditMode: boolean;
    recommendationsGeneratedByAi: boolean;
}

/**
 * VisitForm composes inputs for visit metadata, description, and AI recommendations.
 */
const VisitFormComponent = ({
    formData,
    onFieldChange,
    isGenerating,
    isSaving,
    onGenerate,
    isEditMode,
    recommendationsGeneratedByAi,
}: VisitFormProps) => {
    const trimmedLength = formData.description.trim().length;
    const remainingCharacters = Math.max(0, 50 - trimmedLength);
    const isGenerateDisabled = trimmedLength < 50 || isGenerating || isSaving || !isEditMode;

    let generateDisabledReason: string | null = null;
    if (!isEditMode) {
        generateDisabledReason = 'Zapisz wizytę, aby skorzystać z generowania AI.';
    } else if (trimmedLength < 50) {
        generateDisabledReason = `Dodaj jeszcze ${remainingCharacters} znaków opisu, aby włączyć generowanie.`;
    } else if (isSaving) {
        generateDisabledReason = 'Trwa zapisywanie wizyty – spróbuj ponownie po zakończeniu.';
    }

    return (
        <div className="flex flex-col gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <VisitDatePicker
                value={formData.visitDateTime}
                onChange={(value: string) => onFieldChange('visitDateTime', value)}
                isDisabled={isSaving}
            />

            <VisitInterviewField
                value={formData.interview}
                onChange={(value: string) => onFieldChange('interview', value)}
                isDisabled={isSaving}
            />

            <VisitDescriptionField
                value={formData.description}
                onChange={(value: string) => onFieldChange('description', value)}
                isDisabled={isSaving}
            />

            <AiGenerationSection
                onGenerate={onGenerate}
                isButtonDisabled={isGenerateDisabled}
                isGenerating={isGenerating}
                disabledReason={generateDisabledReason}
            />

            <RecommendationsField
                value={formData.recommendations}
                onChange={(value: string) => onFieldChange('recommendations', value)}
                isReadOnly={isGenerating || isSaving}
                isAiGenerated={recommendationsGeneratedByAi}
            />
        </div>
    );
};

export const VisitForm = memo(VisitFormComponent);
