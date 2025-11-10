# 10x-Physio

A web application designed to optimize the work of physiotherapists by automating the process of creating recommendations and home exercises for patients.

## Table of Contents
- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description

10x-Physio is a web application designed to streamline the workflow of physiotherapists. The core feature is the automation of generating post-visit recommendations and home exercises for patients. By leveraging Artificial Intelligence (AI), the application analyzes the physiotherapist's description of a visit and generates personalized suggestions. These suggestions can then be easily edited and approved by the therapist.

The main problem this project addresses is the significant amount of time physiotherapists spend manually preparing repetitive and often generic therapeutic plans, which is an inefficient and error-prone process. 10x-Physio aims to give back valuable time to therapists, allowing them to focus more on patient care and professional development.

## Tech Stack

### Frontend
- **Vite 7**: For lightning-fast development server and Hot Module Replacement (HMR).
- **React 19**: For building a modern and interactive user interface.
- **TypeScript 5**: For static typing, enhancing code quality and maintainability.
- **Tailwind 4**: For utility-first CSS styling directly in the markup.
- **FluentUI 2**: For a library of consistent and accessible UI components.

### Backend
- **.NET 8**: A modern, high-performance, cross-platform framework.
- **ASP.NET Core**: For building scalable and secure web applications and APIs.

### Database
- **Supabase**: Provides a managed **PostgreSQL** database, built-in user authentication, and auto-generated APIs.

### Artificial Intelligence
- **Openrouter.ai**: Acts as a gateway to access a wide range of AI models (from OpenAI, Anthropic, Google, etc.), enabling flexibility and cost optimization.

### CI/CD & Hosting
- **GitHub Actions**: For automating the build, test, and deployment pipelines.
- **Azure**: As a scalable cloud platform for hosting the .NET and React applications.

## Getting Started Locally

To set up and run this project on your local machine, follow these steps.

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js](https://nodejs.org/) (includes npm)
- A code editor like [Visual Studio](https://visualstudio.microsoft.com/) or [VS Code](https://code.visualstudio.com/)

### Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/mateusz-rytwinski-euvic/10x-devs-project.git
    cd 10x-devs-project
    ```

2.  **Set up the backend (.NET):**
    - Open the `10xPhysio.sln` file in Visual Studio.
    - Build the solution to restore NuGet packages.
    - The backend is configured to run on `https://localhost:7030` and `http://localhost:5138` by default (see `Properties/launchSettings.json`).

3.  **Set up the frontend (React + Vite):**
    - Navigate to the client app directory:
      ```sh
      cd 10xphysio.client
      ```
    - Install npm packages:
      ```sh
      npm install
      ```

### Supabase configuration

The backend expects Supabase credentials to be available at startup. The configuration is bound to the `Supabase` section in `appsettings.json` and validated eagerly. For local development, store the secrets with the .NET user-secrets store so they are not committed to source control:

```sh
dotnet user-secrets set "Supabase:Url" "https://your-project.supabase.co"
dotnet user-secrets set "Supabase:AnonKey" "your-anon-key"
```

Services can request the `ISupabaseClientFactory` interface via dependency injection to obtain an initialized `Supabase.Client` instance when needed.

### AI provider configuration

The AI generation workflow depends on OpenRouter credentials and defaults bound to the `AiGeneration` configuration section. For local development, store the API key and preferred defaults using the .NET user-secrets store:

```sh
dotnet user-secrets set "AiGeneration:ApiBaseUrl" "https://openrouter.ai/api/v1/"
dotnet user-secrets set "AiGeneration:ApiKey" "your-openrouter-api-key"
dotnet user-secrets set "AiGeneration:DefaultModel" "openrouter/auto"
```

Additional optional settings include `DefaultTemperature`, `MinTemperature`, `MaxTemperature`, `MinimumContextLength`, `PromptOverrideLimit`, and `ProviderTimeoutSeconds`. These values are validated on startup to prevent misconfiguration.

#### Authentication API overview

The server exposes four REST endpoints under `api/auth` that proxy Supabase GoTrue operations:

| Method | Route                | Description                                  |
|--------|----------------------|----------------------------------------------|
| POST   | `/api/auth/signup`   | Registers a therapist account in Supabase.   |
| POST   | `/api/auth/login`    | Exchanges credentials for Supabase tokens.   |
| POST   | `/api/auth/logout`   | Revokes the current Supabase session.        |
| GET    | `/api/auth/session`  | Returns a snapshot of the authenticated user.|

- `signup` expects `{ email, password, firstName, lastName }` and returns `{ "message": "account_created" }` when it succeeds.
- `login` returns `{ accessToken, refreshToken, expiresIn, user }` where `user` includes the therapist metadata mirrored from Supabase. Preserve the `accessToken`; it is required for the protected endpoints.
- `logout` and `session` require the header `Authorization: Bearer <Supabase access token>` and respond with `401 Unauthorized` plus `{ "message": "invalid_token" }` when the token is missing or expired.

#### Profile API overview

Authenticated therapists can manage their profile via a dedicated controller backed by weak ETag concurrency:

| Method | Route           | Description                                                    |
|--------|-----------------|----------------------------------------------------------------|
| GET    | `/api/profile`  | Returns the therapist profile and emits a weak ETag header.    |
| PATCH  | `/api/profile`  | Applies profile updates guarded by the supplied `If-Match` ETag.|

- Every call requires `Authorization: Bearer <Supabase access token>`.
- Successful responses include an `ETag` header shaped like `W/"<timestamp>"`; clients must provide it in `If-Match` when patching to avoid overwriting concurrent changes.
- PATCH accepts `{ firstName, lastName }`, trims and validates characters (letters, spaces, hyphen), and rejects no-op submissions with `{ "message": "no_changes_submitted" }`.
- Error responses use the shared `OperationMessageDto` payload so UI layers can surface friendly messages (e.g., `profile_missing`, `etag_mismatch`, `invalid_if_match`).

#### Visit API overview

The visits surface is exposed under `/api/visits` and `/api/patients/{patientId}/visits`, mirroring the implementation plan for therapist-scoped visit management. All routes require a valid Supabase access token in the `Authorization: Bearer <token>` header.

| Method | Route                                               | Description                                                                                     |
|--------|-----------------------------------------------------|-------------------------------------------------------------------------------------------------|
| POST   | `/api/patients/{patientId}/visits`                  | Creates a visit bound to the patient after validating content and therapist ownership.          |
| GET    | `/api/patients/{patientId}/visits`                  | Returns a paginated timeline with optional date filters and recommendation visibility toggle.   |
| GET    | `/api/visits/{visitId}`                             | Retrieves visit details, AI telemetry, and emits a weak ETag header for concurrency.            |
| PATCH  | `/api/visits/{visitId}`                             | Updates visit metadata (`visitDate`, `interview`, `description`) guarded by `If-Match`.         |
| DELETE | `/api/visits/{visitId}`                             | Removes a visit once therapist ownership is confirmed.                                          |
| PUT    | `/api/visits/{visitId}/recommendations`             | Saves therapist-approved recommendations and updates AI tracking metadata.                      |

- `POST` requires at least one non-empty text field (`interview`, `description`, or `recommendations`) and rejects visit dates further than 30 days in the future.
- `GET` list accepts `page`, `pageSize (<=100)`, `from`, `to`, `includeRecommendations`, and `order` (`asc`/`desc`). When `includeRecommendations=false`, the payload omits recommendation text to reduce payload size for timeline views.
- Single visit retrieval includes the latest AI generation ID and the total AI generation count for analytics.
- `PATCH` and `PUT` endpoints **must** include the weak ETag from the previous response (`If-Match: W/"<timestamp>"`). Missing headers produce `400 missing_if_match`, whereas mismatches yield `409 etag_mismatch`.
- Business-rule violations return `422 validation_failed` along with the specific field code (e.g., `visit_content_required`, `recommendations_required`).
- All error payloads use `OperationMessageDto` for consistency with the rest of the API surface.

#### AI Generation API overview

Authenticated therapists can trigger and review AI-generated visit recommendations under `/api/visits/{visitId}`.

| Method | Route                                                          | Description                                                                                  |
|--------|----------------------------------------------------------------|----------------------------------------------------------------------------------------------|
| POST   | `/api/visits/{visitId}/ai-generation`                          | Triggers a new AI draft using optional model, temperature, and prompt override parameters.   |
| GET    | `/api/visits/{visitId}/ai-generations`                         | Returns a paginated list of historical AI generations for the visit.                         |
| GET    | `/api/visits/{visitId}/ai-generations/{generationId}`          | Retrieves the persisted prompt/response pair for auditing and regeneration workflows.        |

- All routes require `Authorization: Bearer <Supabase access token>` and accept the optional header `X-Correlation-Id` for distributed tracing. When omitted, the server generates a correlation identifier and echoes it back in responses.
- The POST command accepts `{ model, temperature, promptOverrides, regenerateFromGenerationId }`. Visit notes must contain at least the configured minimum number of characters (default 120) across `interview` and `description` to proceed.
- Listing supports `page` (≥1, default 1), `pageSize` (≤50, default 10), and `order` (`asc`/`desc`, default `desc`). Responses return `PaginatedResponseDto<VisitAiGenerationListItemDto>`.
- Error messages reuse `OperationMessageDto` enriched with the correlation identifier so logs and clients can align failures quickly.

#### JWT bearer configuration

During startup the API configures the built-in ASP.NET Core JWT bearer handler:

- **Issuer** – derived from the configured Supabase URL with `/auth/v1` suffix (for example `https://your-project.supabase.co/auth/v1`).
- **Audience** – `authenticated` (Supabase default for client tokens).
- **Signing key** – Supabase anon key (`Supabase:AnonKey`) interpreted as an HMAC secret.
- **Clock skew** – one minute to tolerate minimal clock drift.

Any request that fails those checks is surfaced through the global exception middleware as `{ "message": "invalid_token" }` with the appropriate HTTP status code.

#### Rate limiting

`POST /api/auth/signup` and `POST /api/auth/login` are guarded by a fixed-window rate limiter:

- **Permit limit:** 5 requests per minute per client IP address.
- **Queue limit:** 2 pending requests; additional calls receive `429 Too Many Requests`.

This protects the Supabase GoTrue API from brute-force attempts while keeping the rest of the application unaffected.

### Running the Application

You can run both the frontend and backend concurrently using Visual Studio's multi-project startup configuration, which is the default for this solution.

1.  Open `10xPhysio.sln` in Visual Studio.
2.  Press `F5` or click the "Start" button.

This will:
- Launch the ASP.NET Core backend.
- Launch the Vite development server for the React frontend.
- Open a browser window to `https://localhost:54501`, with the backend acting as a proxy for the frontend.

Alternatively, you can run them in separate terminals:
- **Backend:** Run `dotnet run` from the `10xPhysio.Server` directory.
- **Frontend:** Run `npm run dev` from the `10xphysio.client` directory.

## Available Scripts

In the `10xphysio.client` directory, you can run the following scripts:

- `npm run dev`: Starts the Vite development server.
- `npm run build`: Compiles TypeScript and builds the production-ready application.
- `npm run lint`: Lints the codebase using ESLint.
- `npm run preview`: Serves the production build locally for previewing.

## Project Scope

### MVP Features (In Scope)
- **User Authentication**: Secure registration and login for physiotherapists.
- **Patient Management (CRUD)**: Add, view, edit, and delete patient records.
- **Visit Management (CRUD)**: Document patient visits with detailed descriptions.
- **AI-Powered Recommendations**: Automatically generate exercise and care suggestions based on visit notes.
- **Editable Suggestions**: Therapists can review, edit, and approve all AI-generated content.
- **Patient History**: A consolidated view of all past visits and recommendations for each patient.

### Out of Scope for MVP
- Advanced analytics and patient progress reporting.
- Integrations with external systems (e.g., calendars).
- Advanced role-based access control (e.g., receptionists, admins).
- A dedicated mobile application for patients or therapists.
- Automated SMS/email notifications.
- Billing and invoicing modules.

## Project Status

**In Development**

This project is currently in the initial development phase. The focus is on building the core functionalities defined for the Minimum Viable Product (MVP).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
