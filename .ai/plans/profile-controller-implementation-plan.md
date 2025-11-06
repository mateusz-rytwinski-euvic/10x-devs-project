# API Endpoint Implementation Plan: Profile Endpoints

## 1. Endpoint Overview
- Deliver therapist profile retrieval and mutation capabilities for authenticated users backed by the Supabase `profiles` table.
- Enforce optimistic concurrency via weak ETags to avoid overwriting parallel updates and to surface `etag_mismatch` semantics.
- Maintain consistency with existing authentication flows that already hydrate profile metadata from Supabase.

## 2. Request Details
### GET /api/profile
- **HTTP Method:** `GET`
- **URL:** `/api/profile`
- **Headers:**
  - `Authorization: Bearer <jwt>` — required; Supabase-issued access token validated by the API gateway.
- **Query Parameters:** none
- **Request Body:** none

### PATCH /api/profile
- **HTTP Method:** `PATCH`
- **URL:** `/api/profile`
- **Headers:**
  - `Authorization: Bearer <jwt>` — required.
  - `If-Match` — required; weak ETag string formatted as `W/"<timestamp>"` sourced from the last `ProfileSummaryDto` response.
- **Request Body:** `ProfileUpdateCommand`
  - `firstName` *(string, required)* — trim whitespace, length ≤ 100, allow letters, spaces, and hyphen characters.
  - `lastName` *(string, required)* — same validation as `firstName`.

## 3. Types in Scope
- `ProfileSummaryDto` — carry-over DTO used for both GET and PATCH responses, encapsulating profile metadata and computed weak ETag.
- `ProfileUpdateCommand` — PATCH payload already annotated with `[Required]` and `[StringLength(100)]`; extend validation as needed for trimming and character set.
- `WeakEtag` — helper for generating weak ETags; extend with parsing routine to compare incoming `If-Match` values to database timestamps.
- `Profile` (database model) — maps to Supabase `profiles` rows; used when querying and updating via Postgrest client.
- `OperationMessageDto` — standard envelope for error payloads emitted through `ApiException` and middleware.

## 4. Response Details
- **GET /api/profile** — `200 OK`
  - Body: `ProfileSummaryDto` containing `id`, `firstName`, `lastName`, `createdAt`, `updatedAt`, `etag`.
- **PATCH /api/profile** — `200 OK`
  - Body: refreshed `ProfileSummaryDto` reflecting persisted changes and the newly calculated `etag`.
- Error responses return `OperationMessageDto` with `message` matching the logical error code surfaced via `ApiException` (e.g., `invalid_token`, `profile_missing`, `etag_mismatch`).

## 5. Data Flow
1. **Authentication Context**
   - Apply `[Authorize]` with JWT bearer authentication; resolve therapist `Guid` from `HttpContext.User` claims (`sub` or `user_id`).
2. **GET /api/profile Sequence**
   - Acquire Supabase client through `ISupabaseClientFactory`.
   - Query `profiles` using the authenticated user identifier; leverage Postgrest `.Single()` semantics.
   - If no record exists, throw `ApiException(StatusCodes.Status404NotFound, "profile_missing")` for middleware handling.
   - Map entity to `ProfileSummaryDto` via `ProfileSummaryDto.FromEntity` and return 200.
3. **PATCH /api/profile Sequence**
   - Validate `ModelState` and ensure `If-Match` header is present; reject missing header with `ApiException(StatusCodes.Status400BadRequest, "missing_if_match")`.
   - Parse the weak ETag into a timestamp (extend `WeakEtag` parser) and compare to the current `UpdatedAt` retrieved from database; return `409 etag_mismatch` when timestamps differ.
   - Normalize input: trim strings, collapse double spaces, enforce allowed characters, and short-circuit if payload does not modify any value (`400 no_changes_submitted`).
   - Execute update via Supabase Postgrest (e.g., `.Update(new Profile { Id = userId, FirstName = ..., LastName = ... })`), ensuring `therapistId` matches authenticated user.
   - Re-fetch the updated profile to obtain server-generated `UpdatedAt`, compute new ETag, and return the refreshed DTO.

## 6. Security Considerations
- Enforce JWT validation for every call; reject anonymous requests with `401` and no leaked metadata.
- Prevent cross-tenant access by deriving the profile identifier solely from the authenticated principal; never accept an ID from the client.
- Guard against stale updates through strict `If-Match` comparison and early rejection to avoid race conditions.
- Ensure Supabase RLS remains effective by using authenticated Supabase service role credentials and filtering by the user ID in all queries.
- Instrument suspicious events (missing profile, repeated ETag mismatches) via `ILogger` at warning level for security analytics.

## 7. Performance Considerations
- Restrict database interaction to a single read for GET and a read-update-read pattern for PATCH; batch the second read and update within a lightweight transaction if supported by Postgrest.
- Cache Supabase client instances via the existing `ISupabaseClientFactory` to avoid re-initialization overhead per request.
- Avoid unnecessary allocations by reusing DTO mapping helpers and short-circuiting when no field changes are provided.

## 8. Implementation Steps
1. Define `IProfileService` contract (e.g., `Task<ProfileSummaryDto> GetAsync(Guid userId, CancellationToken)` and `Task<ProfileSummaryDto> UpdateAsync(Guid userId, ProfileUpdateCommand command, string ifMatch, CancellationToken)`).
2. Implement `ProfileService` leveraging `ISupabaseClientFactory`, `ILogger<ProfileService>`, and the parsing logic for weak ETags; ensure guard clauses for validation and concurrency.
3. Extend `WeakEtag` with a `TryParse` utility that converts `W/"..."` strings into `DateTimeOffset` and normalizes comparisons using `Utc`. Place guard logic for malformed headers.
4. Register the new service in DI (e.g., `services.AddScoped<IProfileService, ProfileService>()`) within existing extension methods.
5. Create `ProfileController` under `Controllers/` mirroring project conventions: `[ApiController]`, `[Route("api/[controller]")]`, `[Authorize]`, `[ProducesResponseType]` attributes, model-state checks, and invocation of the service.
6. Add centralized header validation helpers if multiple endpoints will reuse `If-Match` parsing (consider a `RequestHeaderExtensions` utility).
7. Document the workflow in developer guides or README and confirm the plan is stored at `.ai/plans/profile-controller-implementation-plan.md` for future implementation reference.

*Completion summary:* Plan recorded at `.ai/plans/profile-controller-implementation-plan.md`; documentation-only change so no builds or tests were executed. Follow-up work is to implement the profile service and controller according to the steps above.
