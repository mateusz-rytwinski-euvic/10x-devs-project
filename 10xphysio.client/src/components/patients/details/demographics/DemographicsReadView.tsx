import { Button } from '@fluentui/react-components';
import { memo } from 'react';
import type { PatientDetailsViewModel } from '../../../../types/patientDetails';

type DemographicsReadViewProps = {
    patient: PatientDetailsViewModel;
    onEdit: () => void;
};

/**
 * DemographicsReadView renders the read-only snapshot of patient demographics with a call-to-action to enter edit mode.
 */
export const DemographicsReadView = memo(({ patient, onEdit }: DemographicsReadViewProps) => {
    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <DetailItem label="Imię" value={patient.firstName} />
                <DetailItem label="Nazwisko" value={patient.lastName} />
                <DetailItem label="Data urodzenia" value={patient.dateOfBirth ?? 'Brak danych'} />
                <DetailItem label="Utworzono" value={patient.createdAtLabel || 'Brak danych'} />
                <DetailItem label="Zaktualizowano" value={patient.updatedAtLabel || 'Brak danych'} />
                {/* ETag is handled in headers for optimistic concurrency but deliberately hidden from clinicians. */}
            </div>

            <div>
                <Button appearance="primary" onClick={onEdit}>
                    Edytuj dane pacjenta
                </Button>
            </div>
        </div>
    );
});

DemographicsReadView.displayName = 'DemographicsReadView';

type DetailItemProps = {
    label: string;
    value: string;
};

const DetailItem = memo(({ label, value }: DetailItemProps) => (
    <div className="rounded-md border border-slate-100 p-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900">{value?.trim() || '—'}</p>
    </div>
));

DetailItem.displayName = 'DetailItem';
