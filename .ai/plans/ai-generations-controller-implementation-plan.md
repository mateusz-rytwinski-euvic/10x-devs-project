# API Endpoint Implementation Plan: AI Recommendation Generation Logs

## 1. Endpoint Overview
- Deliver three visit-scoped endpoints that let therapists trigger AI recommendation drafts and audit generated content: `POST /api/visits/{visitId}/ai-generation`, `GET /api/visits/{visitId}/ai-generations`, and `GET /api/visits/{visitId}/ai-generations/{generationId}`.
- Leverage Supabase as the persistence layer for visit and AI generation records, enforcing therapist ownership through Row-Level Security (RLS) and service-level checks.
- Invoke OpenRouter-hosted models to generate recommendations, persisting prompts, responses, and metadata for compliance and replay scenarios.
- Integrate with existing middleware and exception handling patterns to provide consistent API responses, structured logging, and telemetry for AI operations.

## 2. Request Details
- **Common requirements**
  - Headers: `Authorization: Bearer <Supabase JWT>` (required), `X-Correlation-Id` (optional but recommended for tracing), `Content-Type: application/json` for JSON bodies.
  - Path parameter `{visitId}` (`Guid`, required) present on all three routes; controllers normalize and validate via guard clauses before invoking services.
- **POST /api/visits/{visitId}/ai-generation**
  - HTTP Method: `POST`
  - Request body: `VisitAiGenerationCommand` JSON with optional fields `model` (`string`), `temperature` (`decimal` 0-2), `promptOverrides` (`Dictionary<string,string>`), `regenerateFromGenerationId` (`Guid`).
  - Preconditions: Visit must belong to the authenticated therapist; visit content must include sufficient context (≥20 characters across `interview` or `description`).
- **GET /api/visits/{visitId}/ai-generations**
  - HTTP Method: `GET`
  - Query parameters (all optional): `page` (`int`, default 1, ≥1), `pageSize` (`int`, default 10, max 50), `order` (`string`, `asc` or `desc`, default `desc`).
  - Supports pagination headers (`X-Total-Count`, etc.) via `PaginatedResponseDto` body.
- **GET /api/visits/{visitId}/ai-generations/{generationId}`**
  - HTTP Method: `GET`
  - Additional path parameter `{generationId}` (`Guid`, required) referencing the log entry; validated for therapist ownership.

## 3. Response Details
- **POST**
  - `201 Created` with `VisitAiGenerationCreatedDto` payload: `generationId`, `status`, `model`, `temperature`, `prompt`, `aiResponse`, `recommendationsPreview`, `createdAt`.
  - Error statuses: `400 invalid_input`, `401 invalid_token`, `403 visit_not_owned`, `404 visit_missing`, `422 insufficient_visit_context`, `429 ai_rate_limited`, `502 model_provider_unavailable`, `500 ai_generation_failed`.
- **GET list**
  - `200 OK` returning `PaginatedResponseDto<VisitAiGenerationListItemDto>`; includes pagination metadata and ordered `items`.
  - Error statuses: `400 invalid_pagination`, `401 invalid_token`, `403 visit_not_owned`, `404 visit_missing`.
- **GET detail**
  - `200 OK` returning `VisitAiGenerationDetailDto` with persisted metadata and raw AI response.
  - Error statuses: `401 invalid_token`, `403 visit_not_owned`, `404 ai_generation_missing`.

## 4. Data Flow
- **Authentication & therapist resolution**: Controllers extract Supabase user ID from JWT, reuse existing helper (e.g., `HttpRequestExtensions.GetTherapistId`) to supply `therapistId` to services.
- **POST flow**
  1. Controller validates `visitId`, binds `VisitAiGenerationCommand`, and delegates to `IVisitAiGenerationService.GenerateAsync`.
  2. Service fetches visit via Supabase using `ISupabaseClientFactory`, enforcing therapist ownership and throwing `ApiException(StatusCodes.Status403Forbidden, "visit_not_owned")` when mismatched.
  3. Validation layer ensures visit narrative length threshold, clamps temperature, validates optional regeneration source by checking existing generation ownership.
  4. Build AI prompt string from visit data plus optional overrides using a dedicated `IAiPromptBuilder` to keep logic testable.
  5. Invoke OpenRouter through a typed `HttpClient` (registered via `IHttpClientFactory`) with request/response logging and retry policy (e.g., Polly) respecting rate limits.
  6. Persist `VisitAiGeneration` record via Supabase, including sanitized prompt and AI response, plus duplication of therapist ID for RLS.
  7. Map persisted entity to `VisitAiGenerationCreatedDto` and return.
- **GET list flow**
  1. Controller normalizes pagination parameters (reusing a helper similar to `VisitValidation.NormalizeListOptions` but tailored for AI logs).
  2. Service ensures visit ownership, then queries Supabase `visit_ai_generations` filtered by `visit_id`, ordered per request, applying pagination at the database level when supported; otherwise fetch and slice consistently.
  3. Map results using `VisitAiGenerationListItemDto.FromEntity`, package inside `PaginatedResponseDto`.
- **GET detail flow**
  1. Controller validates both identifiers and forwards to service.
  2. Service confirms visit ownership and fetches the specific generation; if not found, throw `ApiException(StatusCodes.Status404NotFound, "ai_generation_missing")`.
  3. Map entity with `VisitAiGenerationDetailDto.FromEntity` and return.
- **Telemetry**: Services emit structured logs (`logger.LogInformation`) with correlation ID, therapist ID, visit ID, and elapsed time; AI HTTP client uses logging handler for request/response metadata excluding raw PII when necessary.

## 5. Security Considerations
- Enforce JWT validation via existing authentication middleware; reject missing or invalid tokens with `401` before hitting controllers.
- Confirm visit ownership per request using therapist ID comparisons before exposing or mutating AI data to respect Supabase RLS and defense-in-depth.
- Sanitize prompt overrides and visit content before sending to OpenRouter, stripping patient identifiers or masking if policy requires.
- Configure `HttpClient` with TLS 1.2+, store OpenRouter API key in secure configuration (user secrets) injected through options pattern.
- Guard against prompt-injection payloads by enforcing maximum override size and disallowing HTML/script tags, logging suspicious attempts.
- Ensure exception middleware hides raw external provider errors, emitting friendly messages and logging full details for operators only.

## 6. Error Handling
- Use guard clauses in services/controllers to return early on invalid GUIDs, null commands, or empty payloads with `ApiException(StatusCodes.Status400BadRequest, "invalid_input")`.
- Translate Supabase `PostgrestException` instances into `ApiException(StatusCodes.Status502BadGateway, "ai_generation_persistence_failed")` while logging context.
- Wrap OpenRouter HTTP failures (timeouts, non-2xx) into `ApiException(StatusCodes.Status502BadGateway, "model_provider_unavailable")`; include provider status code in logs.
- Detect regeneration requests referencing foreign generation IDs and respond with `403 visit_not_owned` or `404 ai_generation_missing` appropriately.
- Provide consistent error envelopes via existing middleware (problem+json) while adding correlation IDs for cross-service tracing.

## 7. Performance Considerations
- Leverage Supabase `range` queries to page results server-side; fall back to in-memory pagination only after confirming result set size is manageable.
- Reuse a singleton `HttpClient` for OpenRouter to avoid socket exhaustion; enable compression for large prompt/response payloads.
- Keep AI prompt generation lightweight by caching static template fragments and only inserting visit-specific tokens.
- Monitor Supabase query counts and response times via logging; add indexes on `visit_ai_generations(visit_id, created_at DESC)` if not already present (complements provided DB plan).

## 8. Implementation Steps
1. **Define options & clients**: Add `AiGenerationOptions` to configuration (model defaults, temperature bounds, min context length) and register a named `HttpClient` for OpenRouter with default headers.
2. **Service contracts**: Introduce `IVisitAiGenerationService` with `GenerateAsync`, `ListAsync`, and `GetAsync` signatures; add corresponding implementation `VisitAiGenerationService` encapsulating validation, Supabase calls, and AI provider integration.
3. **Validation helpers**: Create `VisitAiGenerationValidation` static class for temperature clamp, prompt override sanitization, regeneration ownership checks, and context length enforcement (≥20 characters) reusing `VisitValidation.NormalizeOptionalContent` when applicable.
4. **Prompt builder**: Implement `IAiPromptBuilder`/`AiPromptBuilder` to assemble prompts from visit data and overrides; include unit tests for placeholder replacement and sanitization rules.
5. **Controller endpoints**: Add `VisitAiGenerationsController` (or extend `VisitsController` with nested routes) using minimal actions that delegate to the service, apply `[Authorize]`, bind parameters, and return DTOs with correct status codes.
6. **Dependency registration**: Update `Program.cs` to register new services, options, and HttpClient; ensure logging scopes include correlation IDs.
7. **Exception**: Extend existing middleware configuration to map `ApiException` codes for AI-specific errors .
8. **Persistence integration**: Within service, use `ISupabaseClientFactory` for database access; add helper methods to fetch visit and generation entities (including regeneration source resolution) with appropriate filters.
9. **Documentation & observability**: Update Swagger via `SwaggerExtensions` to document new endpoints and schemas; add structured logs (`logger.LogInformation`, `LogWarning`, `LogError`) and metrics (timers, counters) around AI generation operations.
10. **Deployment readiness**: Verify configuration secrets in each environment, update CI to run new tests, and document operational runbooks for handling AI provider outages.
