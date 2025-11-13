import { memo } from 'react';
import type { VisitSummaryViewModel } from '../../../../types/patientDetails';
import { VisitsList } from './VisitsList';
import { VisitsToolbar } from './VisitsToolbar';

interface PatientVisitsPanelProps {
    visits: VisitSummaryViewModel[];
    visitLimit: number;
    onChangeVisitLimit: (limit: number) => void;
    onAddVisit: () => void;
    onSelectVisit: (visitId: string) => void;
}

/**
 * PatientVisitsPanel combines visits toolbar and list to present recent visits.
 */
export const PatientVisitsPanel = memo(({ visits, visitLimit, onChangeVisitLimit, onAddVisit, onSelectVisit }: PatientVisitsPanelProps) => {
    return (
        <div className="flex flex-col gap-4">
            <VisitsToolbar visitLimit={visitLimit} onChangeVisitLimit={onChangeVisitLimit} onAddVisit={onAddVisit} />
            <VisitsList items={visits} onSelectVisit={onSelectVisit} />
        </div>
    );
});

PatientVisitsPanel.displayName = 'PatientVisitsPanel';
