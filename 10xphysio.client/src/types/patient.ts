// PatientListRecord represents the normalized patient record used internally in the app.
export interface PatientListRecord {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string | null;
    createdAt: string;
    updatedAt: string;
    latestVisitDate: string | null;
    visitCount: number;
    etag: string;
}

// PatientListItem represents the transformed patient record used by the UI layer.
export interface PatientListItem {
    id: string;
    firstName: string;
    lastName: string;
    lastVisitDate: string;
    visitsCount: number;
    etag: string;
    createdAtLabel: string;
}

// PaginatedResponseDto standardizes the paginated collection used on the frontend.
export interface PaginatedResponseDto<TItem> {
    items: TItem[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

// PatientsQueryParams captures the supported query parameters for retrieving patients.
export interface PatientsQueryParams {
    page: number;
    pageSize: number;
    search?: string;
    sort?: PatientSortField;
    order?: PatientSortOrder;
}

export type PatientSortField = 'lastName' | 'createdAt' | 'latestVisitDate';

export type PatientSortOrder = 'asc' | 'desc';
