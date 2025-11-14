/**
 * DTO returned from the backend containing detailed patient information.
 */
export interface PatientDetailsDto {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string | null;
    createdAt: string;
    updatedAt: string;
    eTag: string;
    visits: VisitSummaryDto[];
}

/**
 * Summary of a patient visit returned from the backend.
 */
export interface VisitSummaryDto {
    id: string;
    patientId: string;
    visitDate: string;
    interview?: string | null;
    description?: string | null;
    recommendations?: string | null;
    recommendationsGeneratedByAi: boolean;
    recommendationsGeneratedAt?: string | null;
}

/**
 * Command payload for creating a new patient.
 */
export interface PatientCreateCommand {
    firstName: string;
    lastName: string;
    dateOfBirth?: string | null;
}

/**
 * Command payload for updating patient demographics.
 */
export interface PatientUpdateCommand {
    firstName: string;
    lastName: string;
    dateOfBirth?: string | null;
}


/**
 * Standard API message returned by the backend for operations.
 */
export interface OperationMessageDto {
    message: string;
    correlationId?: string;
}

/**
 * Route parameters expected for the patient details screen.
 */
export interface PatientDetailsRouteParams extends Record<string, string | undefined> {
    patientId: string;
}

/**
 * Options influencing the patient details query.
 */
export interface PatientDetailsQueryOptions {
    includeVisits: boolean;
    visitsLimit?: number;
}

/**
 * View model consumed by the patient details UI components.
 */
export interface PatientDetailsViewModel {
    id: string;
    fullName: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string | null;
    createdAtLabel: string;
    updatedAtLabel: string;
    eTag: string;
    visits: VisitSummaryViewModel[];
}

/**
 * Visit summary view model adapted for UI consumption.
 */
export interface VisitSummaryViewModel {
    id: string;
    dateLabel: string;
    shortDescription: string;
    hasRecommendations: boolean;
    updatedAtLabel: string;
}

/**
 * Validation errors surfaced to the patient edit form.
 */
export interface ValidationErrors {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    general?: string;
}

/**
 * Result contract for the patient details query hook.
 */
export interface UsePatientDetailsResult {
    data?: PatientDetailsViewModel;
    isLoading: boolean;
    isError: boolean;
    refetch: () => Promise<PatientDetailsViewModel | undefined>;
}

/**
 * Contract returned from the patient edit hook.
 */
