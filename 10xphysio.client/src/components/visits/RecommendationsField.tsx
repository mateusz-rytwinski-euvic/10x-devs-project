import { Field, Textarea } from '@fluentui/react-components';

interface RecommendationsFieldProps {
    value: string;
    onChange: (value: string) => void;
    isReadOnly?: boolean;
    isAiGenerated?: boolean;
}

const MAX_LENGTH = 4000;

/**
 * RecommendationsField presents editable AI output for clinician review.
 */
export const RecommendationsField = ({ value, onChange, isReadOnly = false, isAiGenerated = false }: RecommendationsFieldProps) => {
    return (
        <Field
            label="Zalecenia"
            hint={isAiGenerated ? 'Zalecenia pochodzą z AI – zweryfikuj i dostosuj treść przed zapisaniem.' : 'Możesz dostosować treść przed zapisaniem.'}
        >
            <Textarea
                value={value}
                onChange={(_event, data) => onChange(data.value)}
                readOnly={isReadOnly}
                resize="vertical"
                maxLength={MAX_LENGTH}
                textarea={{ rows: 6 }}
            />
        </Field>
    );
};
