import { Link } from 'react-router-dom';
import { getPatientDetailsPath, getPatientVisitDetailsPath, routes } from '../../routes';

interface BreadcrumbNavigationProps {
    patientId: string | null;
    visitId: string | null;
    isEditMode: boolean;
    patientName?: string | null;
}

/**
 * BreadcrumbNavigation renders a contextual breadcrumb trail for visit form workflows.
 */
export const BreadcrumbNavigation = ({ patientId, visitId, isEditMode, patientName }: BreadcrumbNavigationProps) => {
    const patientLabel = patientName ?? 'Pacjent';
    const visitLabel = isEditMode ? 'Edycja wizyty' : 'Nowa wizyta';

    return (
        <nav aria-label="Ścieżka" className="text-sm text-slate-600">
            <ol className="flex flex-wrap items-center gap-2">
                <li>
                    <Link className="text-sky-700 hover:underline" to={routes.patients}>
                        Pacjenci
                    </Link>
                </li>
                {patientId ? (
                    <li className="flex items-center gap-2">
                        <span className="text-slate-400">/</span>
                        <Link className="text-sky-700 hover:underline" to={getPatientDetailsPath(patientId)}>
                            {patientLabel}
                        </Link>
                    </li>
                ) : null}
                {isEditMode && patientId && visitId ? (
                    <li className="flex items-center gap-2">
                        <span className="text-slate-400">/</span>
                        <Link
                            className="text-sky-700 hover:underline"
                            to={getPatientVisitDetailsPath(patientId, visitId)}
                        >
                            Szczegóły wizyty
                        </Link>
                    </li>
                ) : null}
                <li className="flex items-center gap-2">
                    <span className="text-slate-400">/</span>
                    <span className="font-medium text-slate-900">{visitLabel}</span>
                </li>
            </ol>
        </nav>
    );
};
