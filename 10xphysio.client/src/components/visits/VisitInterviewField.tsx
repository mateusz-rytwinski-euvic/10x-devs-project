import { Field, Textarea } from '@fluentui/react-components';

interface VisitInterviewFieldProps {
    value: string;
    onChange: (value: string) => void;
    isDisabled?: boolean;
}

const MAX_LENGTH = 4000;

/**
 * VisitInterviewField captures optional insights from the initial patient conversation.
 */
export const VisitInterviewField = ({ value, onChange, isDisabled = false }: VisitInterviewFieldProps) => {
    return (
        <Field
            label="Wywiad"
            hint="Opcjonalnie zanotuj wnioski z rozmowy lub badania wstępnego."
        >
            <Textarea
                value={value}
                onChange={(_event, data) => onChange(data.value)}
                disabled={isDisabled}
                resize="vertical"
                maxLength={MAX_LENGTH}
                textarea={{ rows: 6 }}
            />
        </Field>
    );
};
