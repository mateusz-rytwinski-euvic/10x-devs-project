/**
 * VisitDto mirrors the backend payload for visit read operations.
 */
export interface VisitDto {
    id: string;
    patientId: string;
    visitDate: string;
    interview?: string | null;
    description?: string | null;
    recommendations?: string | null;
    recommendationsGeneratedByAi: boolean;
    recommendationsGeneratedAt?: string | null;
    createdAt: string;
    updatedAt: string;
    eTag: string;
    aiGenerationCount?: number | null;
    latestAiGenerationId?: string | null;
}

/**
 * VisitCreateCommand matches the backend contract for POST /patients/{patientId}/visits.
 */
export interface VisitCreateCommand {
    visitDate: string;
    interview?: string | null;
    description?: string | null;
    recommendations?: string | null;
}

/**
 * VisitUpdateCommand maps to PATCH /visits/{visitId} for future editing scenarios.
 */
export interface VisitUpdateCommand {
    visitDate?: string;
    interview?: string | null;
    description?: string | null;
}

/**
 * VisitRecommendationCommand mirrors the payload for PUT /visits/{visitId}/recommendations.
 */
export interface VisitRecommendationCommand {
    recommendations: string;
    aiGenerated: boolean;
    sourceGenerationId?: string | null;
}

/**
 * VisitViewModel normalizes visit data for view consumption.
 */
export interface VisitViewModel {
    id: string;
    patientId: string;
    visitDateLabel: string;
    visitTimeLabel: string;
    createdAtLabel: string;
    updatedAtLabel: string;
    interview?: string | null;
    description?: string | null;
    recommendations?: string | null;
    recommendationsGeneratedByAi: boolean;
    recommendationsGeneratedAtLabel?: string | null;
    eTag: string;
    aiGenerationCountLabel?: string | null;
    latestAiGenerationId?: string | null;
}

/**
 * VisitFormState captures controlled form fields for creating a visit.
 */
export interface VisitFormState {
    visitDate: string;
    visitTime: string;
    interview: string;
    description: string;
    recommendations: string;
}

/**
 * VisitFormErrors exposes validation messages for the visit form.
 */
export interface VisitFormErrors {
    visitDate?: string;
    visitTime?: string;
    description?: string;
    recommendations?: string;
    general?: string;
}
