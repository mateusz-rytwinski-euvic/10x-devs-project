import { Breadcrumb, BreadcrumbButton, BreadcrumbItem } from '@fluentui/react-components';
import { ArrowLeftRegular } from '@fluentui/react-icons';
import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPatientDetailsPath, routes } from '../../../routes';

interface PatientFormBreadcrumbProps {
    patientId: string | null;
    patientName: string;
    isEditMode: boolean;
}

/**
 * PatientFormBreadcrumb mirrors the visit form breadcrumb structure for create/edit states.
 */
const PatientFormBreadcrumbComponent = ({ patientId, patientName, isEditMode }: PatientFormBreadcrumbProps) => {
    const navigate = useNavigate();

    const handlePatientsClick = useCallback(() => {
        navigate(routes.patients);
    }, [navigate]);

    const handleDetailsClick = useCallback(() => {
        if (!patientId) {
            return;
        }

        navigate(getPatientDetailsPath(patientId));
    }, [navigate, patientId]);

    return (
        <nav aria-label="Ścieżka nawigacyjna formularza pacjenta" className="text-sm">
            <Breadcrumb>
                <BreadcrumbItem>
                    <BreadcrumbButton onClick={handlePatientsClick} icon={<ArrowLeftRegular />}>
                        Pacjenci
                    </BreadcrumbButton>
                </BreadcrumbItem>
                {isEditMode && patientId ? (
                    <>
                        <BreadcrumbItem>
                            <BreadcrumbButton onClick={handleDetailsClick}>{patientName || 'Pacjent'}</BreadcrumbButton>
                        </BreadcrumbItem>
                        <BreadcrumbItem>
                            <BreadcrumbButton current>Edytuj</BreadcrumbButton>
                        </BreadcrumbItem>
                    </>
                ) : (
                    <BreadcrumbItem>
                        <BreadcrumbButton current>Nowy pacjent</BreadcrumbButton>
                    </BreadcrumbItem>
                )}
            </Breadcrumb>
        </nav>
    );
};

export const PatientFormBreadcrumb = memo(PatientFormBreadcrumbComponent);

PatientFormBreadcrumb.displayName = 'PatientFormBreadcrumb';
