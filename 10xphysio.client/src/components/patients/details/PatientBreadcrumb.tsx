import { Breadcrumb, BreadcrumbButton, BreadcrumbItem, Tooltip } from '@fluentui/react-components';
import { ArrowLeftRegular } from '@fluentui/react-icons';
import { memo, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../../routes';

interface PatientBreadcrumbProps {
    patientId: string;
    firstName: string;
    lastName: string;
}

/**
 * PatientBreadcrumb displays hierarchical navigation linking back to the patients directory.
 */
export const PatientBreadcrumb = memo(({ patientId, firstName, lastName }: PatientBreadcrumbProps) => {
    const navigate = useNavigate();

    const fullName = useMemo(() => {
        const composed = `${firstName ?? ''} ${lastName ?? ''}`.trim();
        return composed.length > 0 ? composed : 'Nieznany pacjent';
    }, [firstName, lastName]);

    const handlePatientsClick = useCallback(() => {
        navigate(routes.patients);
    }, [navigate]);

    return (
        <nav aria-label="Ścieżka nawigacyjna pacjenta" className="text-sm">
            <Breadcrumb>
                <BreadcrumbItem>
                    <BreadcrumbButton onClick={handlePatientsClick} icon={<ArrowLeftRegular />}>
                        Pacjenci
                    </BreadcrumbButton>
                </BreadcrumbItem>
                <BreadcrumbItem>
                    <Tooltip content={`Identyfikator: ${patientId}`} relationship="description">
                        <BreadcrumbButton current>{fullName}</BreadcrumbButton>
                    </Tooltip>
                </BreadcrumbItem>
            </Breadcrumb>
        </nav>
    );
});

PatientBreadcrumb.displayName = 'PatientBreadcrumb';
