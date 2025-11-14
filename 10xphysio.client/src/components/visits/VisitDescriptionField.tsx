import { Field, Textarea } from '@fluentui/react-components';

interface VisitDescriptionFieldProps {
    value: string;
    onChange: (value: string) => void;
    isDisabled?: boolean;
}

const MIN_LENGTH = 50;
const MAX_LENGTH = 4000;

/**
 * VisitDescriptionField captures the clinical narrative that feeds AI prompts.
 */
export const VisitDescriptionField = ({ value, onChange, isDisabled = false }: VisitDescriptionFieldProps) => {
    const remaining = Math.max(0, MIN_LENGTH - value.trim().length);

    return (
        <Field
            label="Opis wizyty"
            required
            hint={remaining > 0 ? `Dodaj jeszcze ${remaining} znaków, aby włączyć generowanie AI.` : 'Zobowiązania wobec pacjenta i szczegóły badania.'}
        >
            <Textarea
                value={value}
                onChange={(_event, data) => onChange(data.value)}
                disabled={isDisabled}
                resize="vertical"
                maxLength={MAX_LENGTH}
                textarea={{ rows: 8 }}
            />
        </Field>
    );
};
