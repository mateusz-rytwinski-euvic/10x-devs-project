export interface ProfileSummaryDto {
    id: string;
    firstName: string;
    lastName: string;
    preferredAiModel: string | null;
    createdAt: string;
    updatedAt: string;
    eTag: string;
}

export interface ProfileUpdateCommand {
    firstName: string;
    lastName: string;
    preferredAiModel?: string | null;
}

export interface ProfileFormData {
    firstName: string;
    lastName: string;
    preferredAiModel: string;
}

export interface ProfileFormErrors {
    firstName?: string;
    lastName?: string;
    preferredAiModel?: string;
    general?: string;
}
