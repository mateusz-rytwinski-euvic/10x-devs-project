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
    therapistId?: string | null;
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
 * VisitAiGenerationCommand mirrors backend request body for AI generation triggers.
 */
export interface VisitAiGenerationCommand {
    model?: string;
    temperature?: number;
    promptOverrides?: Record<string, string>;
    regenerateFromGenerationId?: string | null;
}

/**
 * VisitAiGenerationCreatedDto mirrors backend response after triggering AI generation.
 */
export interface VisitAiGenerationCreatedDto {
    generationId: string;
    status: string;
    model: string;
    temperature?: number | null;
    prompt: string;
    aiResponse: string;
    recommendationsPreview: string;
    createdAt: string;
}

/**
 * VisitRecommendationStateDto represents the result of saving recommendations.
 */
export interface VisitRecommendationStateDto {
    id: string;
    recommendations: string;
    recommendationsGeneratedByAi: boolean;
    recommendationsGeneratedAt?: string | null;
    updatedAt: string;
    eTag: string;
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
 * VisitFormData captures controlled fields for the new visit form view.
 */
export interface VisitFormData {
    visitDateTime: string;
    interview: string;
    description: string;
    recommendations: string;
}

/**
 * VisitFormViewModel aggregates UI state and command handlers for VisitFormPage.
 */
export interface VisitFormViewModel {
    formData: VisitFormData;
    patientId: string | null;
    isEditMode: boolean;
    isLoading: boolean;
    isGenerating: boolean;
    isSaving: boolean;
    error: Error | null;
    etag: string | null;
    recommendationsGeneratedByAi: boolean;
    latestAiGenerationId: string | null;
    setFormField: <TKey extends keyof VisitFormData>(field: TKey, value: VisitFormData[TKey]) => void;
    handleSaveVisit: () => Promise<void>;
    handleGenerateRecommendations: () => Promise<void>;
    handleSaveRecommendations: () => Promise<void>;
    handleDeleteVisit: () => Promise<void>;
}
