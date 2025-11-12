import { MessageBar, MessageBarBody, MessageBarTitle } from '@fluentui/react-components';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PatientsHeader } from '../components/patients/Header';
import { PatientsPagination } from '../components/patients/Pagination';
import { PatientsList } from '../components/patients/PatientsList';
import { usePatientsViewModel } from '../hooks/usePatientsViewModel';

// PatientsPage composes the patients dashboard view by connecting the view model hook with UI components.
export const PatientsPage = () => {
    const navigate = useNavigate();
    const {
        patients,
        isLoading,
        isFetching,
        error,
        pagination,
        sort,
        searchQuery,
        handleSearch,
        handlePageChange,
        handleSort,
    } = usePatientsViewModel();

    const handleAddPatient = useCallback(() => {
        navigate('/patients/new');
    }, [navigate]);

    const handlePatientSelect = useCallback(
        (patientId: string) => {
            navigate(`/patients/${patientId}`);
        },
        [navigate],
    );

    return (
        <section className="min-h-screen bg-neutral-50 py-10">
            <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4">
                <header className="flex flex-col gap-2">
                    <h1 className="text-3xl font-semibold text-slate-900">Panel pacjentów</h1>
                    <p className="text-base text-slate-600">
                        Przeglądaj listę swoich pacjentów, zarządzaj wizytami i dodawaj nowych podopiecznych.
                    </p>
                </header>

                {error ? (
                    <MessageBar intent="error">
                        <MessageBarBody>
                            <MessageBarTitle>Nie udało się załadować pacjentów</MessageBarTitle>
                            {error.message}
                        </MessageBarBody>
                    </MessageBar>
                ) : null}

                <PatientsHeader
                    searchQuery={searchQuery}
                    onSearch={handleSearch}
                    onAddPatient={handleAddPatient}
                />

                <PatientsList
                    items={patients}
                    isLoading={isLoading}
                    isFetching={isFetching}
                    sort={sort}
                    onSort={handleSort}
                    onItemClick={handlePatientSelect}
                />

                <PatientsPagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                />
            </div>
        </section>
    );
};
