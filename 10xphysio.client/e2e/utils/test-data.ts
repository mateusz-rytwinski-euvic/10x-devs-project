const DEFAULT_PATIENT_CREATED_AT = '2024-10-01T09:30:00Z';
const DEFAULT_VISIT_DATE = '2025-01-15T14:00:00Z';

export interface AuthSessionDto {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

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

export interface PatientsPagePayload<TItem> {
  items: TItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface TestUserCredentials {
  email: string;
  password: string;
}

/**
 * Provides stable credentials for auth-related e2e scenarios.
 */
export const getTestUserCredentials = (): TestUserCredentials => ({
  email: 'terapeuta@example.com',
  password: 'VeryStrongPassword!1',
});

/**
 * Generates a mock AuthSessionDto that mimics a successful login payload.
 */
export const createAuthSession = (overrides: Partial<AuthSessionDto> = {}): AuthSessionDto => ({
  userId: 'auth-user-123',
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  expiresIn: 3600,
  ...overrides,
});

/**
 * Builds a paginated patients response for tests that load the dashboard.
 */
export const createPatientsPage = (
  items: PatientListRecord[] = [],
): PatientsPagePayload<PatientListRecord> => ({
  items,
  page: 1,
  pageSize: 20,
  totalItems: items.length,
  totalPages: 1,
});

/**
 * Returns a single patient list record for list-based expectations.
 */
export const createPatientListRecord = (
  overrides: Partial<PatientListRecord> = {},
): PatientListRecord => ({
  id: 'patient-1',
  firstName: 'Anna',
  lastName: 'Nowak',
  dateOfBirth: '1990-05-12',
  createdAt: DEFAULT_PATIENT_CREATED_AT,
  updatedAt: DEFAULT_PATIENT_CREATED_AT,
  latestVisitDate: DEFAULT_VISIT_DATE,
  visitCount: 5,
  etag: 'etag-123',
  ...overrides,
});
