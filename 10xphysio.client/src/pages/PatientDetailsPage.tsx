import { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { PatientDetailsQueryBoundary } from '../components/patients/details/PatientDetailsQueryBoundary';
import { routes } from '../routes';
import type { PatientDetailsRouteParams } from '../types/patientDetails';
import { isValidGuid } from '../utils/guid';

const DEFAULT_VISITS_LIMIT = 10;
const MIN_VISITS_LIMIT = 1;
const MAX_VISITS_LIMIT = 50;

const clampVisitsLimit = (value: number): number => {
    if (!Number.isFinite(value)) {
        return DEFAULT_VISITS_LIMIT;
    }

    if (value < MIN_VISITS_LIMIT) {
        return MIN_VISITS_LIMIT;
    }

    if (value > MAX_VISITS_LIMIT) {
        return MAX_VISITS_LIMIT;
    }

    return value;
};

// PatientDetailsPage resolves route params and query options, delegating the actual rendering to the query boundary wrapper.
export const PatientDetailsPage = () => {
    const navigate = useNavigate();
    const { patientId } = useParams<PatientDetailsRouteParams>();
    const [searchParams] = useSearchParams();

    const includeVisitsParam = searchParams.get('includeVisits');
    const visitsLimitParam = searchParams.get('visitsLimit');

    const includeVisits = includeVisitsParam
        ? includeVisitsParam.trim().toLowerCase() !== 'false' && includeVisitsParam.trim() !== '0'
        : true;

    const visitsLimit = clampVisitsLimit(visitsLimitParam ? Number.parseInt(visitsLimitParam, 10) : DEFAULT_VISITS_LIMIT);

    const hasValidPatientId = isValidGuid(patientId);

    useEffect(() => {
        if (hasValidPatientId) {
            return;
        }

        navigate(routes.patients, { replace: true });
    }, [hasValidPatientId, navigate]);

    if (!hasValidPatientId || !patientId) {
        return null;
    }

    return (
        <AppLayout mainClassName="bg-neutral-50 py-8">
            <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-12">
                <PatientDetailsQueryBoundary
                    patientId={patientId}
                    includeVisits={includeVisits}
                    visitsLimit={visitsLimit}
                />
            </section>
        </AppLayout>
    );
};
