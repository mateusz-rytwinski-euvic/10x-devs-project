# API Endpoint Implementation Plan: Patients Endpoints

## 1. Endpoint Overview
- Deliver therapist-scoped patient CRUD functionality backed by the Supabase `patients` table and aligned with the RLS policies defined in the database plan.
- Surface list and detail payloads that include visit-derived metadata (`latestVisitDate`, `visitCount`, optional visit summaries) to drive the patient management UI.
- Preserve optimistic concurrency with weak ETags (`patients.updated_at`) and guard against duplicate patient creation/update via the `(therapist_id, lower(first_name), lower(last_name), date_of_birth)` constraint.

## 2. Request Details
### Shared Requirements
- **Headers:** `Authorization: Bearer <jwt>` — required for every route; validate using the existing Supabase JWT configuration.
- **Path Parameters:** `patientId` (GUID) — required for resource operations; reject malformed GUIDs with `ApiException(StatusCodes.Status400BadRequest, "invalid_patient_id")`.

### POST /api/patients
- **HTTP Method:** `POST`
- **URL:** `/api/patients`
- **Body:** `PatientCreateCommand`
  - `firstName` *(string, required)* — trim, collapse internal whitespace, length ≤ 100, allowed characters `[\p{L} -]`.
  - `lastName` *(string, required)* — same normalization and validation as `firstName`.
  - `dateOfBirth` *(string, optional)* — ISO `YYYY-MM-DD`; must parse to `DateOnly` and be ≤ current UTC date.
- **Query Parameters:** none.

### GET /api/patients
- **HTTP Method:** `GET`
- **URL:** `/api/patients`
- **Query Parameters:**
  - `page` *(optional int, default 1)* — must be ≥ 1.
  - `pageSize` *(optional int, default 20)* — range 1–100.
  - `search` *(optional string)* — trim to ≤ 100 chars; used for case-insensitive match on first/last name.
  - `sort` *(optional string)* — one of `lastName` (default), `createdAt`, `latestVisitDate`.
  - `order` *(optional string)* — `asc` or `desc`; default `asc` for `lastName`, otherwise `desc`.
- **Body:** none.

### GET /api/patients/{patientId}
- **HTTP Method:** `GET`
- **URL:** `/api/patients/{patientId}`
- **Query Parameters:**
  - `includeVisits` *(optional bool, default false)* — when true, fetch visit summaries.
  - `visitsLimit` *(optional int, default 5)* — applies only when `includeVisits=true`; enforce range 1–20.
- **Body:** none.

### PATCH /api/patients/{patientId}
- **HTTP Method:** `PATCH`
- **URL:** `/api/patients/{patientId}`
- **Headers:** `If-Match` — required weak ETag from the latest patient response.
- **Body:** `PatientUpdateCommand`
  - `firstName`, `lastName`, `dateOfBirth` — same rules as creation payload.
- **Query Parameters:** none.

### DELETE /api/patients/{patientId}
- **HTTP Method:** `DELETE`
- **URL:** `/api/patients/{patientId}`
- **Body / Query Parameters:** none; respond with empty body on success.

## 3. Response Details
### Success Payloads
- **POST /api/patients** — `201 Created`; body: `PatientDto` with weak ETag echoed via `ETag` header.
- **GET /api/patients** — `200 OK`; body: `PaginatedResponseDto<PatientListItemDto>` including `items`, `page`, `pageSize`, `totalItems`, `totalPages`.
- **GET /api/patients/{patientId}** — `200 OK`; body: `PatientDetailsDto` with optional `visits` (collection of `VisitSummaryDto`).
- **PATCH /api/patients/{patientId}** — `200 OK`; body: refreshed `PatientDto`; reissue updated weak ETag header.
- **DELETE /api/patients/{patientId}** — `204 No Content`; no body.

### DTOs & Command Models
- `PatientCreateCommand`, `PatientUpdateCommand` — incoming payloads with data annotations; extend runtime validation for trimming, allowed characters, and date bounds.
- `PatientDto` — canonical response for create/update flows, including ETag.
- `PatientListItemDto` — list projection with aggregated visit metrics.
- `PatientDetailsDto` — detailed projection used for single-patient retrieval.
- `VisitSummaryDto` — lightweight visit data embedded when `includeVisits=true`.
- `PaginatedResponseDto<T>` — wrapper for paginated lists.
- `OperationMessageDto` — standard error envelope produced by `ExceptionHandlingMiddleware`.
- `WeakEtag` — helper for generating and parsing weak ETag values from timestamps.

## 4. Data Flow
1. **Shared Controller Flow**
   - Apply `[Authorize]` and reuse the existing helper logic to extract the Supabase user ID (`Guid`). If no claim or invalid GUID, throw `ApiException(StatusCodes.Status401Unauthorized, "invalid_token")`.
   - Resolve `IPatientService` via DI; services obtain Supabase client instances through `ISupabaseClientFactory`.
   - Guard ModelState and header presence (e.g., `If-Match`) before invoking service operations to keep controller lean.
2. **Create Patient (POST)**
   - In service, normalize and validate inputs (trim, regex, date checks) before hitting Supabase.
   - Convert `DateOnly?` to UTC `DateTime?` for persistence; set `TherapistId` from authenticated user (ignore any client-provided ID).
   - Perform a pre-check for duplicates by querying `patients` filtered on therapist ID, lower-cased names, and date of birth. Surface `ApiException(StatusCodes.Status409Conflict, "patient_duplicate")` when matches exist.
   - Insert via Postgrest `.Insert`, handling unique constraint violations and mapping the inserted entity to `PatientDto`. Return 201 and attach weak ETag header using `WeakEtag.FromTimestamp`.
3. **List Patients (GET)**
   - Validate pagination parameters and derive defaults; compute `offset`/`limit` for Supabase `.Range`.
   - Build query scoped to therapist ID; apply search by using `ilike` on first/last name with normalized pattern.
   - Apply ordering: `lastName` uses `Order("last_name", isAscending)`, `createdAt` uses `Order("created_at", isAscending)`, `latestVisitDate` requires join logic — fetch visit aggregates per patient using a secondary query against `visits` filtered by patient IDs from the current page and compute `visitCount`/`latestVisitDate` in-memory. Consider adding a Postgrest RPC/view later if performance demands.
   - Fetch total count via `Count(Exact)` and map results into `PatientListItemDto` using aggregated metadata, wrapping in `PaginatedResponseDto`.
4. **Get Patient Detail (GET by ID)**
   - Query single patient by ID and therapist ID; if none, throw `ApiException(StatusCodes.Status404NotFound, "patient_missing")`.
   - When `includeVisits=true`, validate `visitsLimit`, then query `visits` for the patient, ordering by `visit_date` DESC and limiting to the requested count. Map results to `VisitSummaryDto`.
   - Compose `PatientDetailsDto` via `FromEntity`, attach visits when included, and return 200 with `ETag` header.
5. **Update Patient (PATCH)**
   - Ensure `If-Match` header exists; parse using `WeakEtag.TryParse` and compare to current `UpdatedAt` retrieved from Supabase. On mismatch, throw `ApiException(StatusCodes.Status409Conflict, "etag_mismatch")` and log warning.
   - Normalize payload and short-circuit if no effective changes to avoid redundant updates (`ApiException(StatusCodes.Status400BadRequest, "no_changes_submitted")`).
   - Re-run duplicate check only when name/date fields change. Apply update via `.Update` with `Id`, `TherapistId`, and mutated fields. Retry fetch to return fresh DTO and ETag.
6. **Delete Patient (DELETE)**
   - Fetch patient to confirm ownership; if missing, return `404 patient_missing`.
   - Issue delete via `.Delete` scoped to patient ID and therapist ID (Postgrest filter). On success, rely on database cascade to remove visits and AI logs; return 204.

## 5. Security Considerations
- Require Supabase JWT validation and `[Authorize]` across the controller; short-circuit unauthorized calls with `401`.
- Derive the therapist ID exclusively from the token; never trust client-provided identifiers for ownership checks.
- Ensure every Supabase query filters by `therapist_id` to align with RLS policies and prevent cross-tenant leakage.
- Enforce weak ETag comparison on `PATCH` to avoid overwriting concurrent updates.
- Sanitize and validate string inputs to mitigate injection into Postgrest filters and audit logs.
- Log suspicious events (repeated duplicate attempts, ETag mismatches) using `ILogger<PatientService>` for monitoring.

## 6. Error Handling
| Scenario | Status Code | Error Message |
| --- | --- | --- |
| Missing/invalid JWT | 401 | `invalid_token` |
| Malformed GUID path parameter | 400 | `invalid_patient_id` |
| Validation failure (names, pagination, date) | 400 | `invalid_input` or field-specific codes (`first_name_invalid`, etc.) |
| Domain/business rule violation after basic validation (e.g., future DOB, insufficient visit context) | 422 | `validation_failed` or field-specific domain codes |
| Duplicate patient detected | 409 | `patient_duplicate` |
| Weak ETag mismatch on update | 409 | `etag_mismatch` |
| Patient not owned by therapist | 403 | `patient_not_owned` |
| Patient not found | 404 | `patient_missing` |
| Supabase connectivity/response errors | 502 | `supabase_unavailable` (bubbled from middleware) |
| Unhandled exceptions | 500 | `internal_error` |

## 7. Performance
- Reuse `ISupabaseClientFactory` to avoid expensive client initialization per request.
- Use database indexes from the schema plan (`idx_patients_therapist`, `uq_patients_name_dob`) by always filtering on `therapist_id` and normalizing search inputs.
- Limit list queries with `.Range` and avoid loading visits for patients not requested; fetch visit aggregates in a secondary query limited to the current page.
- Cache normalized name validation regex as `RegexOptions.Compiled` to avoid repeated compilation.

## 8. Implementation Steps
1. Define `IPatientService` with async methods for create, list, detail, update, and delete operations (all accepting therapist ID and cancellation token).
2. Implement `PatientService` using `ISupabaseClientFactory`, `ILogger<PatientService>`, and shared validation helpers; encapsulate normalization, duplicate detection, visit aggregation, and Supabase interactions.
3. Extend `WeakEtag` with parsing utilities (if not already available) and create a reusable request helper for extracting `If-Match` and authenticated user ID to share with other controllers.
4. Register the new service in DI within `Program.cs` (`services.AddScoped<IPatientService, PatientService>()`).
5. Introduce `PatientsController` following existing conventions (`[ApiController]`, `[Route("api/[controller]")]`, `[Authorize]`, `ProducesResponseType` attributes) and delegate logic to the service.
6. Add specific validation helpers or static methods to centralize name/date checks, ensuring both create and update flows reuse identical guard clauses.
7. Update API documentation/Swagger annotations (XML comments) and ensure the implementation plan resides at `.ai/plans/patient-controller-implementation-plan.md` for team reference.
