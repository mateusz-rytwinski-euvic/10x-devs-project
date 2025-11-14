import type { SelectTabData, SelectTabEvent, TabValue } from '@fluentui/react-components';
import { Tab, TabList } from '@fluentui/react-components';
import { useCallback, useMemo, useState } from 'react';
import type { PatientDetailsViewModel } from '../../../types/patientDetails';
import { PatientBreadcrumb } from './PatientBreadcrumb';
import { PatientDemographicsPanel } from './demographics/PatientDemographicsPanel';
import { PatientVisitsPanel } from './visits/PatientVisitsPanel';

export type PatientDetailsTab = 'demographics' | 'visits';

interface PatientDetailsLayoutProps {
    patient: PatientDetailsViewModel;
    visitLimit: number;
    onChangeVisitLimit: (nextLimit: number) => void;
    onAddVisit: () => void;
    onSelectVisit: (visitId: string) => void;
    onEditPatient: () => void;
}

export const PatientDetailsLayout = ({
    patient,
    visitLimit,
    onChangeVisitLimit,
    onAddVisit,
    onSelectVisit,
    onEditPatient,
}: PatientDetailsLayoutProps) => {
    const [activeTab, setActiveTab] = useState<PatientDetailsTab>('demographics');

    const handleTabSelect = useCallback(
        (_event: SelectTabEvent, data: SelectTabData) => {
            setActiveTab((data.value as PatientDetailsTab) ?? 'demographics');
        },
        [],
    );

    const tabList = useMemo(() => {
        const tabs: Array<{ value: PatientDetailsTab; label: string }> = [
            { value: 'demographics', label: 'Dane pacjenta' },
            {
                value: 'visits',
                label: 'Wizyty',
            },
        ];

        return (
            <TabList selectedValue={activeTab as TabValue} onTabSelect={handleTabSelect}>
                {tabs.map((tab) => (
                    <Tab key={tab.value} value={tab.value}>
                        <div className="flex flex-col leading-tight">
                            <span>{tab.label}</span>
                        </div>
                    </Tab>
                ))}
            </TabList>
        );
    }, [activeTab, handleTabSelect]);

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
                {tabList}

                {activeTab === 'demographics' ? (
                    <PatientDemographicsPanel patient={patient} onEdit={onEditPatient} />
                ) : null}

                {activeTab === 'visits' ? (
                    <PatientVisitsPanel
                        visits={patient.visits ?? []}
                        visitLimit={visitLimit}
                        onChangeVisitLimit={onChangeVisitLimit}
                        onAddVisit={onAddVisit}
                        onSelectVisit={onSelectVisit}
                    />
                ) : null}
            </section>
        </div>
    );
};
