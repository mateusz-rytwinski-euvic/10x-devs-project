# API Endpoint Implementation Plan: Visits Endpoints

## 1. Endpoint Overview
- Provide therapist-scoped visit management endpoints covering creation, timeline retrieval, detail read, updates, deletion, and recommendation persistence on top of the Supabase `visits` table.
- Maintain optimistic concurrency with weak ETags derived from `visits.updated_at` and expose them through response headers to align with the frontend caching strategy.
- Surface AI telemetry (recommendation flags, counts, latest generation ID) by coordinating with the `visit_ai_generations` audit log to support analytics and future AI workflows.

## 2. Request Details
### Shared Requirements
- **Headers:** `Authorization: Bearer <jwt>` required for all routes; reject missing or invalid tokens with `401 invalid_token`.
- **Route Parameters:** `patientId` and `visitId` must parse to non-empty GUIDs; reject failures with `400 invalid_patient_id` / `invalid_visit_id`.
- **Model State:** Return `ValidationProblem` (400) when data annotations fail; augment with custom guards described below.

### POST /api/patients/{patientId}/visits
- **HTTP Method:** `POST`
- **URL:** `/api/patients/{patientId}/visits`
- **Path Parameters:** `patientId` *(required Guid)* — validated against therapist ownership.
- **Body:** `VisitCreateCommand`
   - `visitDate` *(required DateTimeOffset)* — default to `UtcNow` when omitted; must be ≤ `UtcNow + 30 days`.
   - `interview` *(optional string)* — trim whitespace, collapse repeated whitespace, enforce length ≤ 10,000.
   - `description` *(optional string)* — same sanitization and length constraint.
   - `recommendations` *(optional string)* — same sanitization and length constraint.
- **Additional Rules:** Require at least one of `interview`, `description`, or `recommendations` to be non-empty; reject payloads creating duplicate visits on identical timestamp + patient only at domain layer when necessary.

### GET /api/patients/{patientId}/visits
- **HTTP Method:** `GET`
- **URL:** `/api/patients/{patientId}/visits`
- **Path Parameters:** `patientId` *(required Guid)*.
- **Query Parameters:**
  - `page` *(optional int, default 1)* — must be ≥ 1.
  - `pageSize` *(optional int, default 20, max 100)* — enforce inclusive range [1, 100].
  - `from` *(optional ISO 8601 timestamp)* — inclusive lower bound after conversion to UTC.
  - `to` *(optional ISO 8601 timestamp)* — inclusive upper bound; must be ≥ `from` when both supplied.
  - `includeRecommendations` *(optional bool, default true)* — when false, omit `recommendations` field from items.
  - `order` *(optional enum, default desc)* — accepts `asc` or `desc`, applied to `visit_date`.
- **Body:** none.

### GET /api/visits/{visitId}
- **HTTP Method:** `GET`
- **URL:** `/api/visits/{visitId}`
- **Path Parameters:** `visitId` *(required Guid)*.
- **Body / Query:** none.

### PATCH /api/visits/{visitId}
- **HTTP Method:** `PATCH`
- **URL:** `/api/visits/{visitId}`
- **Headers:** `If-Match` weak ETag required; reject missing headers with `400 missing_if_match`.
- **Body:** `VisitUpdateCommand`
   - `visitDate` *(optional DateTimeOffset)* — must be ≤ `UtcNow + 30 days`.
   - `interview` *(optional string)* — trim and cap at 10,000 chars.
   - `description` *(optional string)* — trim and cap at 10,000 chars.
- **Additional Rules:** Reject requests that would not mutate persisted values with `400 no_changes_submitted`; prevent attempts to reassign `patientId`.

### DELETE /api/visits/{visitId}
- **HTTP Method:** `DELETE`
- **URL:** `/api/visits/{visitId}`
- **Headers:** none beyond authorization.
- **Body / Query:** none; rely on Supabase cascade to remove dependent AI logs.

### PUT /api/visits/{visitId}/recommendations
- **HTTP Method:** `PUT`
- **URL:** `/api/visits/{visitId}/recommendations`
- **Headers:** `If-Match` weak ETag required.
- **Body:** `VisitRecommendationCommand`
   - `recommendations` *(required string)* — trim and enforce length 1–10,000.
  - `aiGenerated` *(optional bool)* — defaults to false.
  - `sourceGenerationId` *(optional Guid)* — required when `aiGenerated=true`; must match an existing `visit_ai_generations.id` for the same visit and therapist.
- **Additional Rules:** When `aiGenerated=false`, clear `recommendationsGeneratedByAi` and `recommendationsGeneratedAt`; when true, stamp `recommendationsGeneratedByAi=true` and `recommendationsGeneratedAt=UtcNow`.

## 3. Used Types
- `VisitCreateCommand`, `VisitUpdateCommand`, `VisitRecommendationCommand` — existing command models; extend validation via a new `VisitValidation` helper for trimming, length limits, and temporal rules.
- `VisitDto` — primary response DTO for create, update, and get operations; ensure it continues to carry `AiGenerationCount`, `LatestAiGenerationId`, `ETag`, and `PaginatedResponseDto` compatibility.
- `VisitRecommendationStateDto` — response DTO for recommendation updates mirroring `VisitDto`'s concurrency metadata.
- `PaginatedResponseDto<T>` — wrapper for list responses; use `PaginatedResponseDto<VisitDto>` for the timeline endpoint.
- `OperationMessageDto` — error envelope emitted by `ExceptionHandlingMiddleware`.
- `Visit` and `VisitAiGeneration` database models — used within the service to translate Supabase responses.
- New supporting types:
  - `VisitValidation` static class encapsulating guard clauses (date window, content length, mutually exclusive options).
  - `VisitListQueryOptions` (optional) to represent sanitized pagination/filter values between controller and service for clarity.

## 4. Response Details
- **POST /api/patients/{patientId}/visits** — `201 Created`; body `VisitDto`; emit `Location: /api/visits/{visitId}` and `ETag` headers.
- **GET /api/patients/{patientId}/visits** — `200 OK`; body `PaginatedResponseDto<VisitDto>`; omit `recommendations` when `includeRecommendations=false`.
- **GET /api/visits/{visitId}** — `200 OK`; body `VisitDto` enriched with `LatestAiGenerationId`; include `ETag`.
- **PATCH /api/visits/{visitId}** — `200 OK`; body refreshed `VisitDto`; include updated `ETag`.
- **DELETE /api/visits/{visitId}** — `204 No Content`; no body.
- **PUT /api/visits/{visitId}/recommendations** — `200 OK`; body `VisitRecommendationStateDto`; include refreshed `ETag`.
- **Error Responses** — return `OperationMessageDto` payloads with status codes dictated in Section 7.

## 5. Data Flow
1. **Shared Controller Path**
   - Add `[Authorize]` to `VisitsController`; use `User.GetRequiredTherapistId()` to resolve the authenticated therapist (`Guid`) and short-circuit with `401 invalid_token` when missing.
   - Inject `IVisitService` (new) to keep controller thin and reusable; pass `HttpContext.RequestAborted` as cancellation token to all service calls.
2. **Create Visit**
   - Controller validates `ModelState`, sanitizes payload via `VisitValidation`, and passes normalized data to service.
   - Service ensures the patient belongs to the therapist by querying `patients` (reuse `PatientService` helper or dedicated Supabase query); throw `403 patient_not_owned` or `404 patient_missing`.
   - Normalize timestamps to UTC, set nullable text fields to `null` when empty, default `recommendationsGeneratedByAi` to `false`.
   - Call Supabase `.Insert` and immediately reload the inserted visit (or use `Prefer: return=representation`) to hydrate trigger-populated timestamps.
   - Compute weak ETag from `UpdatedAt`, log success, and return `VisitDto`.
3. **List Patient Visits**
   - Service normalizes pagination and date filters; convert to Supabase `Range` indices and apply `.Filter("patient_id", Eq, ...)`.
   - Apply `visit_date` ordering via `.Order("visit_date", asc/desc)`.
   - Apply `gte/lte` filters for `from` and `to` using ISO strings.
   - Use `Prefer: count=exact` to retrieve `totalItems` and compute `totalPages`.
   - Fetch AI generation counts and latest generation IDs in a secondary query grouped by `visit_id` (leveraging `visit_ai_generations`); merge results into DTOs.
   - If `includeRecommendations=false`, null out the property before returning to avoid leaking data unnecessarily.
4. **Get Visit Detail**
   - Service fetches visit by ID and therapist via Supabase `.Single`; throw `404 visit_missing` or `403 visit_not_owned`.
   - Fetch the latest AI generation (order by `created_at` desc, limit 1) and count of generations to populate DTO fields.
   - Return `VisitDto` with `ETag`.
5. **Update Visit Metadata**
   - Controller retrieves `If-Match` via `Request.GetRequiredIfMatch()` helper; parse using `WeakEtag.TryParse` and compare to current `UpdatedAt`.
   - Service fetches existing visit; ensure therapist ownership and `patientId` immutability.
   - Apply validated updates (update only supplied fields), call Supabase `.Update`, and reload to obtain new timestamps.
   - Return updated DTO; handle Postgrest concurrency errors by converting to `409 etag_mismatch`.
6. **Delete Visit**
   - Service fetches visit to confirm ownership (404/403 when missing) before issuing `.Delete`.
   - Execute delete filtered by `id` and `patient_id`; rely on cascade to purge `visit_ai_generations`; log completion and return without body.
7. **Save Recommendations**
   - Controller enforces `If-Match`, validates command via `VisitValidation`.
   - Service fetches visit (ownership + concurrency) and optionally verifies `sourceGenerationId` by querying `visit_ai_generations`.
   - Update visit record with `recommendations`, `recommendations_generated_by_ai`, and timestamp logic; persist via `.Update` and reload.
   - Return `VisitRecommendationStateDto`.
8. **Logging**
   - Use `ILogger<VisitService>` to log validation failures, Supabase errors, and concurrency conflicts; allow `ExceptionHandlingMiddleware` to transform `ApiException` into `OperationMessageDto`.

## 6. Security Considerations
- Enforce authorization on every endpoint and ensure therapist scoping for all Supabase queries (`therapist_id` join through patient ownership).
- Treat GUIDs from the client as untrusted: validate format and confirm ownership before returning data to prevent ID enumeration.
- Guard against replay and lost updates via mandatory weak ETags on `PATCH` and `PUT` recommendation endpoints.
- Verify `sourceGenerationId` to prevent cross-tenant injection of AI logs and ensure AI metadata is not exposed to other therapists.
- Sanitize long-form text fields to avoid log injection and to keep Postgrest filters safe from special characters (use parameterized filtering).
- Use HTTPS-only cookies/tokens and avoid echoing sensitive data into logs; rely on structured logging with correlation IDs.

## 7. Error Handling
| Scenario | Status Code | Error Code |
| --- | --- | --- |
| Missing or invalid JWT | 401 | `invalid_token` |
| Malformed or empty `patientId`/`visitId` | 400 | `invalid_patient_id` / `invalid_visit_id` |
| Pagination or date-filter violations | 400 | `invalid_pagination` / `invalid_date_range` |
| Missing `If-Match` header | 400 | `missing_if_match` |
| No effective field changes on update | 400 | `no_changes_submitted` |
| Visit or patient not owned by therapist | 403 | `patient_not_owned` / `visit_not_owned` |
| Patient or visit not found | 404 | `patient_missing` / `visit_missing` |
| Referenced AI generation not found | 404 | `ai_generation_missing` |
| Weak ETag mismatch | 409 | `etag_mismatch` |
| Business-rule violations (empty content, future visit date beyond window) | 422 | `validation_failed` (with field-specific detail) |
| Supabase/Postgrest connectivity issues | 502 | `supabase_unavailable` |
| Unhandled exceptions | 500 | `internal_error` |

## 8. Performance
- Filter by `patient_id` and `visit_date` to leverage `idx_visits_patient_date`; keep queries paginated via `.Range` to avoid large payloads.
- Normalize date filters to UTC and push them into Supabase filters to minimize server-side data post-processing.
- Batch retrieval of AI metadata by querying `visit_ai_generations` with `IN` clause on current page visit IDs instead of per-item calls.
- Reuse `ISupabaseClientFactory` to avoid repeated client instantiation and share HTTP connection pools.

## 9. Implementation Steps
1. Define `IVisitService` interface exposing `CreateAsync`, `ListAsync`, `GetAsync`, `UpdateAsync`, `DeleteAsync`, and `SaveRecommendationsAsync`.
2. Introduce `VisitValidation` helper encapsulating string trimming, content length checks, date window enforcement, and ETag parsing utilities.
3. Implement `VisitService` using Supabase Postgrest client; include ownership checks, AI metadata aggregation, error translation to `ApiException`, and structured logging.
4. Add `VisitsController` with route attributes mirroring the API specification, delegating to `IVisitService`, and reusing existing extension helpers for `If-Match` and therapist extraction.
5. Register `IVisitService` directly in `Program.cs` with scoped lifetime.
6. Extend DTO mapping helpers (`VisitDto.FromEntity`, `VisitRecommendationStateDto.FromVisit`) to accept AI metadata parameters where necessary.
7. Update Swagger (XML comments, `ProducesResponseType`) to document the new endpoints and their request/response schemas.
9. Wire new endpoints into the API plan documentation and ensure `.ai/plans/visits-controller-implementation-plan.md` stays current for future iterations.

## 10. Implementation Status (2025-11-10)
- `VisitService` and `VisitsController` are implemented and registered in DI, covering all CRUD and recommendation workflows described above.
- README now documents the visit API surface, including parameters, concurrency requirements, and error contracts.
- Swagger operation filter has been extended so PATCH/PUT visit endpoints surface the required `If-Match` header in UI tooling.
