import { Button, Dropdown, Option, Tooltip } from '@fluentui/react-components';
import { AddRegular } from '@fluentui/react-icons';
import { memo, useCallback } from 'react';

interface VisitsToolbarProps {
    visitLimit: number;
    onChangeVisitLimit: (limit: number) => void;
    onAddVisit: () => void;
}

const VISIT_LIMIT_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50];

/**
 * VisitsToolbar exposes quick actions for adding visits and adjusting the scope of the embedded visits list.
 */
export const VisitsToolbar = memo(({ visitLimit, onChangeVisitLimit, onAddVisit }: VisitsToolbarProps) => {
    const handleLimitChange = useCallback(
        (_event: unknown, data: { optionValue?: string }) => {
            if (!data.optionValue) {
                return;
            }

            const parsed = Number.parseInt(data.optionValue, 10);

            if (Number.isNaN(parsed)) {
                return;
            }

            onChangeVisitLimit(parsed);
        },
        [onChangeVisitLimit],
    );

    return (
        <div className="flex flex-wrap items-center gap-3">
            <Button appearance="primary" icon={<AddRegular />} onClick={onAddVisit}>
                Dodaj wizytę
            </Button>

            <Tooltip relationship="label" content="Określ maksymalną liczbę wizyt wyświetlanych w panelu">
                <Dropdown
                    aria-label="Limit wizyt"
                    value={`Limit wizyt: ${visitLimit}`}
                    onOptionSelect={handleLimitChange}
                >
                    {VISIT_LIMIT_OPTIONS.map((option) => (
                        <Option key={option} value={String(option)} text={`${option}`}>
                            {option}
                        </Option>
                    ))}
                </Dropdown>
            </Tooltip>
        </div>
    );
});

VisitsToolbar.displayName = 'VisitsToolbar';
