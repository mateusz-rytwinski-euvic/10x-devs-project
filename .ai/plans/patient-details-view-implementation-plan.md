# Patient Details View Implementation Plan

## 1. Overview
The Patient Details view provides a comprehensive, concurrency-aware presentation of a single patient together with (optionally) a bounded list of recent visit summaries. It enables therapists to: inspect demographics, navigate historical visits, initiate creation of a new visit, and trigger patient demographic edits while honoring backend ETag concurrency. The view emphasizes fast data access (React Query), clear separation of concerns (presentational vs. container components), and resilient UX (loading, error, and empty states).

## 2. Routing
Path: `/patients/:patientId`
Optional query params: `?includeVisits=true&visitsLimit=10` (frontend decides defaults internally)
Route is protected by authentication (wrapped in `PrivateRoute`).

## 3. Component Structure
```
PatientDetailsPage (route-level container)
├─ PatientDetailsQueryBoundary (fetch + loading/error states)
│  └─ PatientDetailsLayout
│     ├─ PatientBreadcrumb
│     ├─ PivotTabs
│     │  ├─ PatientDemographicsPanel
│     │  │   └─ DemographicsReadView (or DemographicsEditForm when editing)
│     │  └─ PatientVisitsPanel
│     │      ├─ VisitsToolbar (Add Visit button, optional limit selector)
│     │      ├─ VisitsList (DetailsList / virtual list)
│     │      └─ EmptyVisitsPlaceholder / ShimmerSkeleton
│     └─ ConcurrencyInfoBadge (ETag timestamp display)
└─ GlobalToasts / MessageBarPortal
```
Auxiliary hooks:
- `usePatientDetails(patientId, includeVisits, visitsLimit)` — data fetching (React Query)
- `useEditPatient()` — manages edit state, optimistic update, ETag handling
- `useVisitsNavigation(patientId)` — navigation helpers for visit creation/edit

## 4. Component Details
### PatientDetailsPage
- Purpose: Route container resolving params, orchestrating query/hook composition, deciding includeVisits & limit defaults.
- Elements: `<PatientDetailsQueryBoundary/>` plus auth guard wrapper.
- Events: On mount triggers data fetch; on param change refetches.
- Validation: Reject invalid `patientId` (non-GUID) early with redirect to `/patients` and toast.
- Types: `PatientDetailsRouteParams`, `PatientDetailsQueryOptions`.
- Props: None (obtains params via router).

### PatientDetailsQueryBoundary
- Purpose: Encapsulate loading, error, and success states for patient details query.
- Elements: Conditional rendering (Spinner / MessageBar error / PatientDetailsLayout).
- Events: Retry button on error state.
- Validation: None beyond surfacing query errors.
- Types: `PatientDetailsDto`, `QueryStatus`.
- Props: `patientId`, `includeVisits`, `visitsLimit`.

### PatientDetailsLayout
- Purpose: Structural wrapper combining breadcrumb, tabs, and concurrency display.
- Elements: `<PatientBreadcrumb/>`, `<PivotTabs/>`, `<ConcurrencyInfoBadge/>`.
- Events: None directly; passes callbacks down.
- Validation: Ensures DTO presence; if missing, shows fallback.
- Types: `PatientDetailsDto`.
- Props: `patient`, `onEditStart`, `onEditCancel`, `onEditSubmit`, `editing`, `visitLimit`, `onChangeVisitLimit`.

### PatientBreadcrumb
- Purpose: Display hierarchical navigation: Patients > {Patient Name}.
- Elements: Fluent UI `Breadcrumb`.
- Events: Click Patients crumb -> navigate `/patients`.
- Validation: Patient name presence (fallback "Unknown Patient").
- Types: `{ id: string; firstName: string; lastName: string }`.
- Props: `patientId`, `firstName`, `lastName`.

### PivotTabs
- Purpose: Provide tabbed navigation between demographics and visits.
- Elements: Fluent UI `Pivot` with two items.
- Events: Tab change updates internal state (`activeTab`).
- Validation: None.
- Types: `PatientDetailsDto` subset.
- Props: `patient`, `editing`, `onEditStart`, `onEditCancel`, `onEditSubmit`, `visits`, `visitLimit`, `onChangeVisitLimit`.

### PatientDemographicsPanel
- Purpose: Present demographic info or an edit form (controlled by `editing`).
- Elements: Key-value display (Read mode) OR `DemographicsEditForm`.
- Events: Click Edit -> `onEditStart`; Cancel -> `onEditCancel`; Save -> `onEditSubmit`.
- Validation: Shows ETag, created/updated timestamps.
- Types: `PatientDetailsViewModel`.
- Props: `viewModel`, `editing`, `onEditStart`, `onEditCancel`, `onEditSubmit`.

### DemographicsReadView
- Purpose: Static presentation of patient fields.
- Elements: Definition list or grid; Edit button.
- Events: Edit.
- Validation: Date formatting (local or ISO), fallback "—" for null DOB.
- Types: `PatientDetailsViewModel`.
- Props: Same as panel subset.

### DemographicsEditForm
- Purpose: Controlled inputs for patient update (FirstName, LastName, DateOfBirth).
- Elements: Fluent UI `TextField` (first/last), `DatePicker` (DOB), Save / Cancel buttons.
- Events: Field change; Save triggers PATCH; Cancel discards.
- Validation: Required first/last (length ≤100), optional DOB; disable Save if invalid or dirty ETag mismatch.
- Types: `PatientUpdateCommand`, `FormState`, `ValidationErrors`.
- Props: `initial`, `etag`, `onSubmit(command)`, `onCancel`.

### ConcurrencyInfoBadge
- Purpose: Surface ETag & last updated for transparency.
- Elements: `Badge` or subtle `Text` component.
- Events: Copy ETag to clipboard (optional tooltip).
- Validation: None.
- Types: `{ etag: string; updatedAt: DateTimeOffset }`.
- Props: same.

### PatientVisitsPanel
- Purpose: Show recent visits list with ability to create new visit.
- Elements: `VisitsToolbar`, `VisitsList` or placeholders.
- Events: Add Visit -> navigate to `/patients/:patientId/visits/new`; row click -> visit edit.
- Validation: Limit adjustment ensures positive integer; enforce server `visitsLimit` bounds (e.g. 1–50 assumed).
- Types: `VisitSummaryDto[]`.
- Props: `visits`, `onAddVisit`, `onSelectVisit`, `visitLimit`, `onChangeVisitLimit`, `loadingVisits`.

### VisitsToolbar
- Purpose: Actions & filtering (limit selector).
- Elements: `PrimaryButton` (Add Visit), optional `NumberField` or dropdown for limit.
- Events: Click Add, change limit.
- Validation: Limit numeric & within allowed range.
- Types: `VisitLimitState`.
- Props: per panel.

### VisitsList
- Purpose: Render visit summaries; performant for moderate size (<50).
- Elements: Fluent UI `DetailsList` with columns: Date, Synopsis, Recommendations presence, Actions.
- Events: Row click -> select; Column sort (client-side DESC by date default).
- Validation: None (display only).
- Types: `VisitSummaryViewModel[]`.
- Props: `items`, `onSelect`.

### EmptyVisitsPlaceholder / ShimmerSkeleton
- Purpose: Display when loading or no visits.
- Elements: Skeleton rows or message.
- Events: None.
- Validation: None.
- Types: None.
- Props: `state`.

### GlobalToasts / MessageBarPortal
- Purpose: Central ephemeral feedback (success/error).
- Elements: `MessageBar` stacked provider.
- Events: Dismiss.
- Validation: None.
- Types: `ToastMessage`.
- Props: `messages`, `onDismiss`.

## 5. Types
Backend DTOs consumed:
- `PatientDetailsDto`: { id: Guid; firstName: string; lastName: string; dateOfBirth?: DateOnly; createdAt: DateTimeOffset; updatedAt: DateTimeOffset; eTag: string; visits: VisitSummaryDto[] }
- `PatientUpdateCommand` (payload): { firstName: string; lastName: string; dateOfBirth?: DateOnly }
- `VisitSummaryDto` (inferred; not read but assumed minimal fields): { id: Guid; visitDate: DateTimeOffset; description: string; hasRecommendations: boolean; updatedAt: DateTimeOffset; eTag?: string }
- `OperationMessageDto` (for errors/messages): { message: string; correlationId?: string }

New frontend types:
- `PatientDetailsRouteParams`: { patientId: string }
- `PatientDetailsQueryOptions`: { includeVisits: boolean; visitsLimit?: number }
- `PatientDetailsViewModel`: Mapped & formatted fields -> { id: string; fullName: string; firstName: string; lastName: string; dateOfBirth?: string; createdAt: string; updatedAt: string; eTag: string; visits: VisitSummaryViewModel[] }
- `VisitSummaryViewModel`: { id: string; date: string; shortDescription: string; hasRecommendations: boolean }
- `EditPatientFormState`: { firstName: string; lastName: string; dateOfBirth?: string }
- `ValidationErrors`: { firstName?: string; lastName?: string; dateOfBirth?: string; general?: string }
- `ToastMessage`: { id: string; intent: 'success' | 'error' | 'info'; text: string }
- `UsePatientDetailsResult`: { data?: PatientDetailsDto; isLoading: boolean; isError: boolean; refetch(): void }
- `UseEditPatientResult`: { editing: boolean; start(): void; cancel(): void; submit(command: PatientUpdateCommand): Promise<void>; isSaving: boolean; errors: ValidationErrors }

## 6. State Management
React Query drives remote state:
- Query key: `['patientDetails', patientId, includeVisits, visitsLimit]`
- Stale time: 30s (ETag prevents unsafe edits; short window acceptable)
- Refetch triggers: on successful PATCH (invalidate key).
Local UI state:
- `activeTab` (string: 'demographics' | 'visits')
- `editing` boolean (from `useEditPatient`)
- `formState` object (controlled inputs)
- `visitLimit` number (persist to query param optional)
- `toastMessages` array
Custom hooks:
- `usePatientDetails` wraps `useQuery` & maps DTO to view model lazily.
- `useEditPatient` stores snapshot, validates, executes PATCH with `If-Match: etag` header.
- `useVisitsNavigation` pushes router paths for visit actions.
Error + loading states unified via `PatientDetailsQueryBoundary`.

## 7. API Integration
Endpoint: `GET /api/patients/{patientId}?includeVisits={bool}&visitsLimit={int?}`
- Request headers: `Authorization: Bearer <token>`.
- Response: `PatientDetailsDto`.
Update: `PATCH /api/patients/{patientId}`
- Headers: `Authorization`, `If-Match: <patient.eTag>`
- Body: `PatientUpdateCommand` JSON
- Success: `200 OK` returns `PatientDto` (need to merge into existing detail state; refetch preferred for consistency).
Concurrency:
- On 409 or precondition failure (ETag mismatch), show toast, force refetch.

## 8. User Interactions
- Edit button: enters edit mode; form fields focus first name.
- Save: validates (non-empty, ≤100 chars) then PATCH; on success toast + exit edit.
- Cancel: revert to read-only; discard local changes.
- Add Visit: navigate to new visit route.
- Visit row click: navigate to visit detail/edit route.
- Tab switch: toggles active panel.
- Limit change: updates `visitLimit` and triggers refetch if includeVisits.
- Retry (error state): calls `refetch()`.

## 9. Conditions & Validation
Demographics form:
- FirstName required, length ≤100.
- LastName required, length ≤100.
- DateOfBirth optional; if present must be valid date & not future (client check).
Concurrency:
- Before submit ensure current cached ETag equals original; if changed due to background refetch warn user.
Visits panel:
- visitLimit integer 1–50; sanitize out-of-range to nearest boundary.
Routing:
- `patientId` must be GUID; invalid -> redirect + toast.

## 10. Error Handling
Categories:
- Network/500: Show MessageBar (retry) + log (console/error boundary hook).
- 404: Redirect to `/patients` with error toast "Patient not found".
- 409 (ETag mismatch): Show toast "Record updated elsewhere, reloading" then refetch.
- Validation (400 / 422): Surface field errors; general message fallback.
- Unauthorized (401): Force logout flow (clear auth store, navigate `/login`).
Fallback displays:
- Empty visits list -> placeholder message + Add Visit button.
Logging: Central error logger (extend existing auth hook pattern) capturing correlationId if present.

## 11. Implementation Steps
1. Define route in `routes.ts` with `path: '/patients/:patientId'` and element `PatientDetailsPage` wrapped by `PrivateRoute`.
2. Create types file `types/patientDetails.ts` with DTO re-exports + new view model & form types.
3. Implement `usePatientDetails` hook: compose query, map DTO -> `PatientDetailsViewModel`.
4. Implement `useEditPatient` hook: local editing state, validation, PATCH call using existing patient service (extend `patientService.ts`).
5. Extend `patientService.ts` with `getPatientDetails(patientId, options)` and `updatePatient(patientId, command, etag)`.
6. Build `PatientDetailsPage.tsx` route container: parse params, set defaults (`includeVisits=true`, `visitsLimit=10`), invoke hooks, render boundary.
7. Create `PatientDetailsQueryBoundary.tsx` handling loading (Shimmer/Skeleton), error (MessageBar), success layout.
8. Implement `PatientDetailsLayout.tsx` with breadcrumb, pivot tabs, concurrency badge.
9. Build `PatientBreadcrumb.tsx` using Fluent UI breadcrumb component.
10. Create demographics components: `PatientDemographicsPanel.tsx`, `DemographicsReadView.tsx`, `DemographicsEditForm.tsx` (controlled inputs + validation hints).
11. Create visits panel components: `PatientVisitsPanel.tsx`, `VisitsToolbar.tsx`, `VisitsList.tsx`, `EmptyVisitsPlaceholder.tsx`.
12. Add ETag + timestamp display via `ConcurrencyInfoBadge.tsx`.
13. Wire edit flow: propagate callbacks from layout to form, integrate `useEditPatient` save/cancel.
14. Integrate toast system or reuse existing global message provider (add success/error notifications on actions).
15. Add visit limit control (simple numeric input) feeding into query invalidate.
16. Ensure PATCH handler sends `If-Match` header; handle 409 by refetch + toast.
17. Add error category handling (404 redirect, 401 logout) in service layer or hook.
18. Add Storybook or component tests for demographics form (validation & disabled Save state).
19. Document usage in `README` or a dedicated `docs/patient-details.md` (optional).
20. Final code review focusing on concurrency, validation, and error clarity.
