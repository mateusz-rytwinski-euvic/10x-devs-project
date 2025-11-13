import { Button } from '@fluentui/react-components';
import { memo } from 'react';
import type { VisitSummaryViewModel } from '../../../../types/patientDetails';

interface VisitsListProps {
    items: VisitSummaryViewModel[];
    onSelectVisit: (visitId: string) => void;
}

/**
 * VisitsList renders visit summaries as an accessible list when Fluent UI DetailsList is not available.
 */
export const VisitsList = memo(({ items, onSelectVisit }: VisitsListProps) => {
    if (items.length === 0) {
        return <p className="text-sm text-slate-500">Brak wizyt do wyświetlenia.</p>;
    }

    return (
        <ul className="flex flex-col divide-y divide-slate-200" role="list">
            {items.map((visit) => (
                <li key={visit.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900">{visit.dateLabel}</span>
                        <span className="text-sm text-slate-600">{visit.shortDescription || 'Brak opisu'}</span>
                        <span className="text-xs text-slate-500">Zaktualizowano: {visit.updatedAtLabel}</span>
                        {visit.hasRecommendations ? (
                            <span className="text-xs text-emerald-600">Zawiera zalecenia</span>
                        ) : null}
                    </div>
                    <Button appearance="secondary" size="small" onClick={() => onSelectVisit(visit.id)}>
                        Otwórz wizytę
                    </Button>
                </li>
            ))}
        </ul>
    );
});

VisitsList.displayName = 'VisitsList';
