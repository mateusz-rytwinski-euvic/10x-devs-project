# REST API Plan

## 1. Resources
- **Auth Session (Supabase GoTrue)**: External authentication and session management powered by Supabase GoTrue; stores user credentials and tokens outside of the application database while exposing JWTs consumed by the API.
- **Profile (`profiles`)**: One-to-one record for each Supabase user containing therapist metadata (`first_name`, `last_name`, timestamps). Primary key matches the Supabase user ID. Each profile owns many patients.
- **Patient (`patients`)**: Therapist-owned patient record with basic demographics and timestamps. References `profiles` via `therapist_id` and deletes cascade to visits. Uniqueness enforced per therapist on lowercased name plus optional date of birth.
- **Visit (`visits`)**: Records patient encounters including `visit_date`, `interview`, `description`, persisted recommendations, AI flags, and timestamps. References `patients` and cascades deletes. Indexed on `(patient_id, visit_date DESC)` for efficient history retrieval.
- **Visit AI Generation (`visit_ai_generations`)**: Audit log entries capturing the full AI generation context (prompt, raw response, model metadata, timestamps). References `visits` and duplicates `therapist_id` for RLS-friendly filtering and analytics.

## 2. Endpoints

### Auth Sessions (Supabase integration)

- **POST /api/auth/signup**
  - Description: Register a new therapist through Supabase GoTrue and create the matching `profiles` record.
  - Request JSON:
    ```json
    {
      "email": "therapist@example.com",
      "password": "Passw0rd!",
      "firstName": "Anna",
      "lastName": "Kowalska"
    }
    ```
  - Response JSON:
    ```json
    {
      "userId": "7f5c0d86-9ae3-4a2a-9bf7-6da30ae9db32",
      "accessToken": "jwt-token",
      "refreshToken": "refresh-token",
      "expiresIn": 3600,
      "profile": {
        "id": "7f5c0d86-9ae3-4a2a-9bf7-6da30ae9db32",
        "firstName": "Anna",
        "lastName": "Kowalska",
        "createdAt": "2025-01-01T12:00:00Z",
        "updatedAt": "2025-01-01T12:00:00Z"
      }
    }
    ```
  - Success: `201 Created` — `account_created`
  - Errors:
    - `400 Bad Request` — `invalid_input`
    - `409 Conflict` — `email_already_registered`
    - `422 Unprocessable Entity` — `password_strength_failed`
    - `502 Bad Gateway` — `supabase_unavailable`

- **POST /api/auth/login**
  - Description: Authenticate a therapist via Supabase and issue API tokens.
  - Request JSON:
    ```json
    {
      "email": "therapist@example.com",
      "password": "Passw0rd!"
    }
    ```
  - Response JSON:
    ```json
    {
      "userId": "7f5c0d86-9ae3-4a2a-9bf7-6da30ae9db32",
      "accessToken": "jwt-token",
      "refreshToken": "refresh-token",
      "expiresIn": 3600,
      "profile": {
        "id": "7f5c0d86-9ae3-4a2a-9bf7-6da30ae9db32",
        "firstName": "Anna",
        "lastName": "Kowalska",
        "updatedAt": "2025-01-01T12:00:00Z"
      }
    }
    ```
  - Success: `200 OK` — `session_created`
  - Errors:
    - `400 Bad Request` — `invalid_credentials`
    - `423 Locked` — `account_locked`
    - `502 Bad Gateway` — `supabase_unavailable`

- **POST /api/auth/logout**
  - Description: Invalidate the refresh token and revoke the active session.
  - Request JSON:
    ```json
    {
      "refreshToken": "refresh-token"
    }
    ```
  - Response JSON:
    ```json
    {
      "message": "Session revoked"
    }
    ```
  - Success: `200 OK` — `session_revoked`
  - Errors:
    - `400 Bad Request` — `invalid_input`
    - `401 Unauthorized` — `invalid_session`
    - `502 Bad Gateway` — `supabase_unavailable`

- **GET /api/auth/session**
  - Description: Validate the bearer token and return the current session profile snapshot.
  - Response JSON:
    ```json
    {
      "userId": "7f5c0d86-9ae3-4a2a-9bf7-6da30ae9db32",
      "email": "therapist@example.com",
      "issuedAt": "2025-01-01T12:00:00Z",
      "expiresAt": "2025-01-01T13:00:00Z",
      "profile": {
        "id": "7f5c0d86-9ae3-4a2a-9bf7-6da30ae9db32",
        "firstName": "Anna",
        "lastName": "Kowalska",
        "updatedAt": "2025-01-01T12:00:00Z"
      }
    }
    ```
  - Success: `200 OK` — `session_valid`
  - Errors:
    - `401 Unauthorized` — `invalid_token`
    - `403 Forbidden` — `profile_missing`
    - `502 Bad Gateway` — `supabase_unavailable`

### Profiles

- **GET /api/profile**
  - Description: Retrieve the authenticated therapist profile.
  - Response JSON:
    ```json
    {
      "id": "7f5c0d86-9ae3-4a2a-9bf7-6da30ae9db32",
      "firstName": "Anna",
      "lastName": "Kowalska",
      "createdAt": "2025-01-01T12:00:00Z",
      "updatedAt": "2025-01-02T09:15:00Z",
      "etag": "W/\"2025-01-02T09:15:00Z\""
    }
    ```
  - Success: `200 OK` — `profile_retrieved`
  - Errors:
    - `401 Unauthorized` — `invalid_token`
    - `404 Not Found` — `profile_missing`

- **PATCH /api/profile**
  - Description: Update therapist metadata. Requires `If-Match` header with the last known `etag`.
  - Request JSON:
    ```json
    {
      "firstName": "Anna",
      "lastName": "Kowalska-Nowak"
    }
    ```
  - Response JSON:
    ```json
    {
      "id": "7f5c0d86-9ae3-4a2a-9bf7-6da30ae9db32",
      "firstName": "Anna",
      "lastName": "Kowalska-Nowak",
      "updatedAt": "2025-01-05T10:30:00Z",
      "etag": "W/\"2025-01-05T10:30:00Z\""
    }
    ```
  - Success: `200 OK` — `profile_updated`
  - Errors:
    - `400 Bad Request` — `invalid_input`
    - `401 Unauthorized` — `invalid_token`
    - `409 Conflict` — `etag_mismatch`
    - `422 Unprocessable Entity` — `validation_failed`

### Patients

- **POST /api/patients**
  - Description: Create a new patient owned by the authenticated therapist.
  - Request JSON:
    ```json
    {
      "firstName": "Jan",
      "lastName": "Nowak",
      "dateOfBirth": "1990-06-15"
    }
    ```
  - Response JSON:
    ```json
    {
      "id": "ae733e5c-7a12-4a5e-87f5-0c6b4c9c2460",
      "therapistId": "7f5c0d86-9ae3-4a2a-9bf7-6da30ae9db32",
      "firstName": "Jan",
      "lastName": "Nowak",
      "dateOfBirth": "1990-06-15",
      "createdAt": "2025-01-10T08:00:00Z",
      "updatedAt": "2025-01-10T08:00:00Z",
      "etag": "W/\"2025-01-10T08:00:00Z\""
    }
    ```
  - Success: `201 Created` — `patient_created`
  - Errors:
    - `400 Bad Request` — `invalid_input`
    - `401 Unauthorized` — `invalid_token`
    - `409 Conflict` — `patient_duplicate`
    - `422 Unprocessable Entity` — `validation_failed`

- **GET /api/patients**
  - Description: List patients belonging to the authenticated therapist with pagination, search, and sorting.
  - Query parameters:
    - `page` (optional, default `1`, integer ≥ 1)
    - `pageSize` (optional, default `20`, integer 1–100)
    - `search` (optional, case-insensitive match on first/last name)
    - `sort` (optional, one of `lastName`, `createdAt`, `latestVisitDate`, default `lastName`)
    - `order` (optional, `asc` or `desc`, default `asc` for `lastName`, otherwise `desc`)
  - Response JSON:
    ```json
    {
      "items": [
        {
          "id": "ae733e5c-7a12-4a5e-87f5-0c6b4c9c2460",
          "firstName": "Jan",
          "lastName": "Nowak",
          "dateOfBirth": "1990-06-15",
          "createdAt": "2025-01-10T08:00:00Z",
          "updatedAt": "2025-01-10T08:15:00Z",
          "latestVisitDate": "2025-02-02T09:00:00Z",
          "visitCount": 3,
          "etag": "W/\"2025-01-10T08:15:00Z\""
        }
      ],
      "page": 1,
      "pageSize": 20,
      "totalItems": 1,
      "totalPages": 1
    }
    ```
  - Success: `200 OK` — `patients_list_retrieved`
  - Errors:
    - `400 Bad Request` — `invalid_pagination`
    - `401 Unauthorized` — `invalid_token`

- **GET /api/patients/{patientId}**
  - Description: Retrieve full patient details, optionally including recent visits.
  - Query parameters:
    - `includeVisits` (optional boolean, default `false`)
    - `visitsLimit` (effective when `includeVisits=true`, default `5`, max `20`)
  - Response JSON:
    ```json
    {
      "id": "ae733e5c-7a12-4a5e-87f5-0c6b4c9c2460",
      "firstName": "Jan",
      "lastName": "Nowak",
      "dateOfBirth": "1990-06-15",
      "createdAt": "2025-01-10T08:00:00Z",
      "updatedAt": "2025-02-02T09:00:00Z",
      "etag": "W/\"2025-02-02T09:00:00Z\"",
      "visits": [
        {
          "id": "256d96e7-1c3b-4bcc-a9dd-5cbf8d98c83b",
          "visitDate": "2025-02-02T09:00:00Z",
          "description": "Follow-up session",
          "recommendations": "Stretch daily",
          "recommendationsGeneratedByAi": true,
          "recommendationsGeneratedAt": "2025-02-02T09:05:00Z"
        }
      ]
    }
    ```
  - Success: `200 OK` — `patient_retrieved`
  - Errors:
    - `401 Unauthorized` — `invalid_token`
    - `403 Forbidden` — `patient_not_owned`
    - `404 Not Found` — `patient_missing`

- **PATCH /api/patients/{patientId}**
  - Description: Update patient demographics. Requires `If-Match` header.
  - Request JSON:
    ```json
    {
      "firstName": "Jan",
      "lastName": "Kowalski",
      "dateOfBirth": "1990-06-15"
    }
    ```
  - Response JSON:
    ```json
    {
      "id": "ae733e5c-7a12-4a5e-87f5-0c6b4c9c2460",
      "firstName": "Jan",
      "lastName": "Kowalski",
      "dateOfBirth": "1990-06-15",
      "updatedAt": "2025-02-10T14:20:00Z",
      "etag": "W/\"2025-02-10T14:20:00Z\""
    }
    ```
  - Success: `200 OK` — `patient_updated`
  - Errors:
    - `400 Bad Request` — `invalid_input`
    - `401 Unauthorized` — `invalid_token`
    - `403 Forbidden` — `patient_not_owned`
    - `409 Conflict` — `etag_mismatch`
    - `409 Conflict` — `patient_duplicate`
    - `422 Unprocessable Entity` — `validation_failed`

- **DELETE /api/patients/{patientId}**
  - Description: Soft-delete patient context; cascades to visits as per database rules.
  - Response JSON: _empty body_
  - Success: `204 No Content` — `patient_deleted`
  - Errors:
    - `401 Unauthorized` — `invalid_token`
    - `403 Forbidden` — `patient_not_owned`
    - `404 Not Found` — `patient_missing`

### Visits

- **POST /api/patients/{patientId}/visits**
  - Description: Record a new visit for the given patient.
  - Request JSON:
    ```json
    {
      "visitDate": "2025-02-15T09:30:00Z",
      "interview": "Patient reports reduced pain.",
      "description": "Mobilization and stretching exercises performed.",
      "recommendations": null
    }
    ```
  - Response JSON:
    ```json
    {
      "id": "256d96e7-1c3b-4bcc-a9dd-5cbf8d98c83b",
      "patientId": "ae733e5c-7a12-4a5e-87f5-0c6b4c9c2460",
      "visitDate": "2025-02-15T09:30:00Z",
      "interview": "Patient reports reduced pain.",
      "description": "Mobilization and stretching exercises performed.",
      "recommendations": null,
      "recommendationsGeneratedByAi": false,
      "recommendationsGeneratedAt": null,
      "createdAt": "2025-02-15T09:45:00Z",
      "updatedAt": "2025-02-15T09:45:00Z",
      "etag": "W/\"2025-02-15T09:45:00Z\""
    }
    ```
  - Success: `201 Created` — `visit_created`
  - Errors:
    - `400 Bad Request` — `invalid_input`
    - `401 Unauthorized` — `invalid_token`
    - `403 Forbidden` — `patient_not_owned`
    - `404 Not Found` — `patient_missing`
    - `422 Unprocessable Entity` — `validation_failed`

- **GET /api/patients/{patientId}/visits**
  - Description: Paginated timeline of visits for the patient, sorted by `visitDate` descending by default.
  - Query parameters:
    - `page` (optional, default `1`)
    - `pageSize` (optional, default `20`, max `100`)
    - `from` (optional ISO timestamp filter inclusive)
    - `to` (optional ISO timestamp filter inclusive)
    - `includeRecommendations` (optional boolean, default `true`)
    - `order` (optional, `asc` or `desc`, default `desc`)
  - Response JSON:
    ```json
    {
      "items": [
        {
          "id": "256d96e7-1c3b-4bcc-a9dd-5cbf8d98c83b",
          "visitDate": "2025-02-15T09:30:00Z",
          "interview": "Patient reports reduced pain.",
          "description": "Mobilization and stretching exercises performed.",
          "recommendations": null,
          "recommendationsGeneratedByAi": false,
          "recommendationsGeneratedAt": null,
          "createdAt": "2025-02-15T09:45:00Z",
          "updatedAt": "2025-02-15T09:45:00Z",
          "aiGenerationCount": 1
        }
      ],
      "page": 1,
      "pageSize": 20,
      "totalItems": 1,
      "totalPages": 1
    }
    ```
  - Success: `200 OK` — `visits_list_retrieved`
  - Errors:
    - `400 Bad Request` — `invalid_pagination`
    - `401 Unauthorized` — `invalid_token`
    - `403 Forbidden` — `patient_not_owned`
    - `404 Not Found` — `patient_missing`

- **GET /api/visits/{visitId}**
  - Description: Fetch a single visit with AI metadata.
  - Response JSON:
    ```json
    {
      "id": "256d96e7-1c3b-4bcc-a9dd-5cbf8d98c83b",
      "patientId": "ae733e5c-7a12-4a5e-87f5-0c6b4c9c2460",
      "visitDate": "2025-02-15T09:30:00Z",
      "interview": "Patient reports reduced pain.",
      "description": "Mobilization and stretching exercises performed.",
      "recommendations": "Stretch daily",
      "recommendationsGeneratedByAi": true,
      "recommendationsGeneratedAt": "2025-02-15T09:50:00Z",
      "createdAt": "2025-02-15T09:45:00Z",
      "updatedAt": "2025-02-15T09:50:00Z",
      "etag": "W/\"2025-02-15T09:50:00Z\"",
      "latestAiGenerationId": "8a146f48-4271-4e5e-b6ac-2485d0f3e4a9"
    }
    ```
  - Success: `200 OK` — `visit_retrieved`
  - Errors:
    - `401 Unauthorized` — `invalid_token`
    - `403 Forbidden` — `visit_not_owned`
    - `404 Not Found` — `visit_missing`

- **PATCH /api/visits/{visitId}**
  - Description: Update visit date, interview, or description. Requires `If-Match`.
  - Request JSON:
    ```json
    {
      "visitDate": "2025-02-16T10:00:00Z",
      "interview": "Pain resolved.",
      "description": "Manual therapy and exercise review."
    }
    ```
  - Response JSON:
    ```json
    {
      "id": "256d96e7-1c3b-4bcc-a9dd-5cbf8d98c83b",
      "patientId": "ae733e5c-7a12-4a5e-87f5-0c6b4c9c2460",
      "visitDate": "2025-02-16T10:00:00Z",
      "interview": "Pain resolved.",
      "description": "Manual therapy and exercise review.",
      "recommendations": "Stretch daily",
      "recommendationsGeneratedByAi": true,
      "recommendationsGeneratedAt": "2025-02-15T09:50:00Z",
      "updatedAt": "2025-02-16T10:05:00Z",
      "etag": "W/\"2025-02-16T10:05:00Z\""
    }
    ```
  - Success: `200 OK` — `visit_updated`
  - Errors:
    - `400 Bad Request` — `invalid_input`
    - `401 Unauthorized` — `invalid_token`
    - `403 Forbidden` — `visit_not_owned`
    - `409 Conflict` — `etag_mismatch`
    - `422 Unprocessable Entity` — `validation_failed`

- **DELETE /api/visits/{visitId}**
  - Description: Remove a visit and its AI logs.
  - Response JSON: _empty body_
  - Success: `204 No Content` — `visit_deleted`
  - Errors:
    - `401 Unauthorized` — `invalid_token`
    - `403 Forbidden` — `visit_not_owned`
    - `404 Not Found` — `visit_missing`

- **PUT /api/visits/{visitId}/recommendations**
  - Description: Persist the therapist-approved recommendations and flag AI involvement. Requires `If-Match`.
  - Request JSON:
    ```json
    {
      "recommendations": "Stretch daily and perform core stability exercises.",
      "aiGenerated": true,
      "sourceGenerationId": "8a146f48-4271-4e5e-b6ac-2485d0f3e4a9"
    }
    ```
  - Response JSON:
    ```json
    {
      "id": "256d96e7-1c3b-4bcc-a9dd-5cbf8d98c83b",
      "recommendations": "Stretch daily and perform core stability exercises.",
      "recommendationsGeneratedByAi": true,
      "recommendationsGeneratedAt": "2025-02-15T09:55:00Z",
      "updatedAt": "2025-02-15T09:55:00Z",
      "etag": "W/\"2025-02-15T09:55:00Z\""
    }
    ```
  - Success: `200 OK` — `recommendations_saved`
  - Errors:
    - `400 Bad Request` — `invalid_input`
    - `401 Unauthorized` — `invalid_token`
    - `403 Forbidden` — `visit_not_owned`
    - `404 Not Found` — `visit_missing`
    - `409 Conflict` — `etag_mismatch`
    - `422 Unprocessable Entity` — `validation_failed`

### AI Recommendation Generation Logs

- **POST /api/visits/{visitId}/ai-generation**
  - Description: Trigger AI recommendation generation using OpenRouter, persist the log, and return the draft suggestions.
  - Request JSON:
    ```json
    {
      "model": "openrouter/gpt-4.1-mini",
      "temperature": 0.2,
      "promptOverrides": {
        "goal": "Focus on mobility improvement"
      },
      "regenerateFromGenerationId": "8a146f48-4271-4e5e-b6ac-2485d0f3e4a9"
    }
    ```
  - Response JSON:
    ```json
    {
      "generationId": "3e8d4d86-9af1-4bba-af72-8707b2b69d0c",
      "status": "completed",
      "model": "openrouter/gpt-4.1-mini",
      "temperature": 0.2,
      "prompt": "Full prompt text...",
      "aiResponse": "Suggested exercises...",
      "recommendationsPreview": "Suggested exercises...",
      "createdAt": "2025-02-15T09:52:00Z"
    }
    ```
  - Success: `201 Created` — `ai_generation_completed`
  - Errors:
    - `400 Bad Request` — `invalid_input`
    - `401 Unauthorized` — `invalid_token`
    - `403 Forbidden` — `visit_not_owned`
    - `404 Not Found` — `visit_missing`
    - `422 Unprocessable Entity` — `insufficient_visit_context`
    - `429 Too Many Requests` — `ai_rate_limited`
    - `502 Bad Gateway` — `model_provider_unavailable`

- **GET /api/visits/{visitId}/ai-generations**
  - Description: Paginated list of AI generation logs for auditing and analytics.
  - Query parameters:
    - `page` (optional, default `1`)
    - `pageSize` (optional, default `10`, max `50`)
    - `order` (optional, `asc` or `desc`, default `desc`)
  - Response JSON:
    ```json
    {
      "items": [
        {
          "id": "3e8d4d86-9af1-4bba-af72-8707b2b69d0c",
          "model": "openrouter/gpt-4.1-mini",
          "temperature": 0.2,
          "prompt": "Full prompt text...",
          "aiResponse": "Suggested exercises...",
          "createdAt": "2025-02-15T09:52:00Z"
        }
      ],
      "page": 1,
      "pageSize": 10,
      "totalItems": 1,
      "totalPages": 1
    }
    ```
  - Success: `200 OK` — `ai_generations_list_retrieved`
  - Errors:
    - `400 Bad Request` — `invalid_pagination`
    - `401 Unauthorized` — `invalid_token`
    - `403 Forbidden` — `visit_not_owned`
    - `404 Not Found` — `visit_missing`

- **GET /api/visits/{visitId}/ai-generations/{generationId}**
  - Description: Retrieve a single AI generation log entry for detailed review.
  - Response JSON:
    ```json
    {
      "id": "3e8d4d86-9af1-4bba-af72-8707b2b69d0c",
      "visitId": "256d96e7-1c3b-4bcc-a9dd-5cbf8d98c83b",
      "therapistId": "7f5c0d86-9ae3-4a2a-9bf7-6da30ae9db32",
      "model": "openrouter/gpt-4.1-mini",
      "temperature": 0.2,
      "prompt": "Full prompt text...",
      "aiResponse": "Suggested exercises...",
      "createdAt": "2025-02-15T09:52:00Z"
    }
    ```
  - Success: `200 OK` — `ai_generation_retrieved`
  - Errors:
    - `401 Unauthorized` — `invalid_token`
    - `403 Forbidden` — `visit_not_owned`
    - `404 Not Found` — `ai_generation_missing`

## 3. Authentication and Authorization

- Adopt Supabase GoTrue as the source of truth for accounts and sessions; the API expects an `Authorization: Bearer <JWT>` header issued by Supabase for all protected routes.
- On each request, validate the JWT using Supabase's JWKS, extract `auth.uid()`, and resolve the therapist profile. Reject the call with `403` if the profile row is missing to guard against partial sign-ups.
- Scope all data queries by the authenticated `therapistId` to align with database RLS policies; never accept therapist IDs from the client.
- Leverage database Row-Level Security (`visit_ai_generations`, `patients`, `visits`) as defense in depth while enforcing the same ownership checks in application code.
- Store refresh tokens securely (HTTP-only cookie or secure storage) and revoke them via the logout endpoint.
- Apply global rate limiting (e.g., 60 requests/minute per therapist) and a stricter limit for AI generation (e.g., 10 requests/minute) to protect third-party quotas.
- Emit structured audit logs (`userId`, `endpoint`, `resultCode`, `correlationId`) for security monitoring.
- Require HTTPS; reject insecure requests and strip sensitive headers from logs.

## 4. Validation and Business Logic

### Auth
- Enforce password policy from PRD (≥8 characters, at least one uppercase letter, and one digit) before calling Supabase.
- Validate email format and normalize to lowercase; respond with `409` if `email_already_registered`.
- After signup, automatically create a `profiles` row using the Supabase trigger or fallback logic if the trigger fails.

### Profile
- Trim whitespace, reject empty `firstName`/`lastName`, and cap length (e.g., 100 characters).
- Use `updated_at` to produce the weak `etag`; require `If-Match` on modifications to prevent lost updates.

### Patient
- Require non-empty `firstName`/`lastName`; allow Unicode letters, spaces, and hyphens.
- Validate `dateOfBirth` (ISO `YYYY-MM-DD`, must be in the past or today).
- Check the unique combination `(therapist_id, lower(first_name), lower(last_name), date_of_birth)` before insert/update; surface violations as `409 patient_duplicate`.
- On delete, cascade visits per schema; return `204` once the transaction completes.
- Implement case-insensitive search using `ILIKE` and leverage `idx_patients_therapist` for ownership filtering.

### Visit
- Ensure the patient belongs to the therapist before insert/update/delete.
- Require `visitDate` (ISO 8601, default to current UTC) and prevent dates more than 30 days in the future (assumption to keep data realistic).
- Allow `interview` and `description` to be `null` but enforce at least one non-empty section when generating AI output.
- Preserve historical integrity: prevent reassignment of `patientId` during updates.
- Use `(patient_id, visit_date DESC)` index to implement pagination efficiently.
- When recommendations are updated manually, flip `recommendationsGeneratedByAi` to `false` unless `aiGenerated=true` is explicitly provided.

### AI Generation
- Require sufficient visit context (`description` or `interview` length ≥ 20 characters); otherwise return `422 insufficient_visit_context`.
- Support optional `model` override while defaulting to a cost-effective OpenRouter model defined in configuration.
- Persist prompt and raw response in `visit_ai_generations`; scrub PII before logging to external monitoring.
- Derive `recommendationsPreview` from the AI response but do not overwrite visit recommendations until the therapist confirms via `PUT /recommendations`.
- Stamp `recommendationsGeneratedByAi=true` and `recommendationsGeneratedAt=UtcNow` when the therapist saves AI output.
- Enforce rate limiting with exponential backoff hints (`429 ai_rate_limited`, include `Retry-After` header`).