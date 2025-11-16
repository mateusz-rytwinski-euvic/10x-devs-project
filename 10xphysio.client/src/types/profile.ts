export interface ProfileSummaryDto {
    id: string;
    firstName: string;
    lastName: string;
    createdAt: string;
    updatedAt: string;
    eTag: string;
}

export interface ProfileUpdateCommand {
    firstName: string;
    lastName: string;
}

export interface ProfileFormData {
    firstName: string;
    lastName: string;
}

export interface ProfileFormErrors {
    firstName?: string;
    lastName?: string;
    general?: string;
}
