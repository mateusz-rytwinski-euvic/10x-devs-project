import type { PatientDetailsViewModel } from '../../../types/patientDetails';
import { PatientBreadcrumb } from './PatientBreadcrumb';
import { PatientDemographicsPanel } from './demographics/PatientDemographicsPanel';
import { PatientVisitsPanel } from './visits/PatientVisitsPanel';

interface PatientDetailsLayoutProps {
    patient: PatientDetailsViewModel;
    visitLimit: number;
    onChangeVisitLimit: (nextLimit: number) => void;
    onAddVisit: () => void;
    onSelectVisit: (visitId: string) => void;
    onEditPatient: () => void;
}

/**
 * PatientDetailsLayout stacks the patient demographics card above the visits list to keep critical data visible at all times.
 */
export const PatientDetailsLayout = ({
    patient,
    visitLimit,
    onChangeVisitLimit,
    onAddVisit,
    onSelectVisit,
    onEditPatient,
}: PatientDetailsLayoutProps) => {
    return (
        <div className="flex flex-col gap-6">
            <PatientBreadcrumb patientId={patient.id} firstName={patient.firstName} lastName={patient.lastName} />

            <header className="flex flex-col gap-1">
                <h1 className="text-3xl font-semibold text-slate-900">{patient.fullName}</h1>
                <p className="text-sm text-slate-600">
                    Zarządzaj danymi pacjenta, przeglądaj historię wizyt i twórz nowe wizyty.
                </p>
            </header>

            <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <PatientDemographicsPanel patient={patient} onEdit={onEditPatient} />
            </section>

            <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <PatientVisitsPanel
                    visits={patient.visits ?? []}
                    visitLimit={visitLimit}
                    onChangeVisitLimit={onChangeVisitLimit}
                    onAddVisit={onAddVisit}
                    onSelectVisit={onSelectVisit}
                />
            </section>
        </div>
    );
};
