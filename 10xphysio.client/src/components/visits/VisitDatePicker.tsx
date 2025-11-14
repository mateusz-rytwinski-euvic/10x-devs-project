import { Field, Input } from '@fluentui/react-components';

interface VisitDatePickerProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    isRequired?: boolean;
    isDisabled?: boolean;
}

/**
 * VisitDatePicker wraps FluentUI date picker component for consistent styling.
 */
export const VisitDatePicker = ({
    value,
    onChange,
    label = 'Data wizyty',
    isRequired = true,
    isDisabled = false,
}: VisitDatePickerProps) => {
    const formattedValue = value && value.trim().length > 0 ? value : '';

    return (
        <Field label={label} required={isRequired} className="flex flex-col gap-2">
            <Input
                type="datetime-local"
                value={formattedValue}
                onChange={(_event, data) => {
                    onChange(data.value ?? '');
                }}
                disabled={isDisabled}
                step={300}
            />
        </Field>
    );
};
