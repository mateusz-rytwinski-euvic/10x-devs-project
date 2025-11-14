# Visit Form View Implementation Plan

## 1. Overview
This document outlines the implementation plan for the **Visit Form View**. This view allows physiotherapists to create a new visit for a patient or edit an existing one. Its core functionalities include documenting the visit's details (interview, examination), generating AI-powered treatment recommendations based on the description, allowing the therapist to edit and approve these recommendations, and saving the complete visit record.

## 2. View Routing
The view will be accessible via two distinct, protected routes:
- **Create Mode:** `/patients/:patientId/visits/new`
- **Edit Mode:** `/patients/:patientId/visits/:visitId`

Access to these routes requires user authentication.

## 3. Component Structure
The view will be composed of a main container component with several specialized child components.

```
VisitFormPage (Container)
├── BreadcrumbNavigation
├── VisitForm
│   ├── VisitDatePicker
│   ├── VisitDescriptionField
│   ├── AiGenerationSection
│   │   ├── GenerateButton
│   │   ├── AiWarningMessage
│   ├── RecommendationsField
├── FormActionButtons
│   ├── SaveVisitButton
│   ├── SaveRecommendationsButton
│   ├── DeleteVisitButton (Edit mode only)
└── ToastNotifications (for feedback)
```

## 4. Component Details

### `VisitFormPage` (Container)
- **Description:** The main container that fetches data, manages the overall state using a custom hook (`useVisitFormViewModel`), and orchestrates the child components. It determines whether the form is in "create" or "edit" mode based on the URL parameters.
- **Main Elements:** Renders `BreadcrumbNavigation`, `VisitForm`, and `FormActionButtons`.
- **Supported Interactions:** Handles the submission logic for creating/updating visits and saving recommendations by calling the appropriate functions from the ViewModel.
- **Validation:** None at this level.
- **Types:** `VisitFormViewModel`
- **Props:** None.

### `VisitForm`
- **Description:** A presentation component that lays out the form fields and sections. It receives the form state and event handlers from the parent container.
- **Main Elements:** `VisitDatePicker`, `VisitDescriptionField`, `AiGenerationSection`, `RecommendationsField`.
- **Supported Interactions:** Passes user input changes (date, description, recommendations) up to the parent container via callback functions.
- **Validation:** None directly; visual validation state is passed down via props.
- **Types:** `VisitFormData`
- **Props:**
  - `formData: VisitFormData`
  - `onFieldChange: (field: keyof VisitFormData, value: any) => void`
  - `isGenerating: boolean`
  - `isSaving: boolean`
  - `onGenerate: () => void`

### `VisitDatePicker`
- **Description:** A controlled component for selecting the visit date.
- **Main Elements:** A `DatePicker` from the FluentUI library.
- **Supported Interactions:** `onChange` event to update the date.
- **Validation:** The date is a required field.
- **Types:** `Date`
- **Props:**
  - `value: Date`
  - `onChange: (date: Date) => void`
  - `label: string`
  - `isRequired: boolean`

### `VisitDescriptionField`
- **Description:** A controlled multiline text field for the therapist to enter the visit description (interview, examination).
- **Main Elements:** A multiline `TextField` from FluentUI.
- **Supported Interactions:** `onChange` event to update the description text.
- **Validation:** The description must have a minimum length (e.g., 50 characters) to enable the AI generation button.
- **Types:** `string`
- **Props:**
  - `value: string`
  - `onChange: (text: string) => void`
  - `label: string`
  - `placeholder: string`

### `AiGenerationSection`
- **Description:** Contains the button to trigger AI recommendation generation and the mandatory warning message.
- **Main Elements:** `PrimaryButton` ("Generate AI Recommendations"), `MessageBar` (for the warning).
- **Supported Interactions:** `onClick` on the button triggers the generation process.
- **Validation:** The "Generate" button is disabled if the description is too short or if a generation is already in progress.
- **Types:** None.
- **Props:**
  - `onGenerate: () => void`
  - `isButtonDisabled: boolean`
  - `isGenerating: boolean`

### `RecommendationsField`
- **Description:** A controlled multiline text field to display and edit the AI-generated recommendations.
- **Main Elements:** A multiline `TextField` from FluentUI.
- **Supported Interactions:** `onChange` event to update the recommendations text.
- **Validation:** None.
- **Types:** `string`
- **Props:**
  - `value: string`
  - `onChange: (text: string) => void`
  - `label: string`
  - `isReadOnly: boolean` (while generating)

### `FormActionButtons`
- **Description:** A group of buttons for the main form actions.
- **Main Elements:** `PrimaryButton` ("Save Visit"), `DefaultButton` ("Save Recommendations"), `DangerButton` ("Delete Visit").
- **Supported Interactions:** `onClick` for each button.
- **Validation:** Buttons can be disabled based on form state (e.g., `isSaving`).
- **Types:** None.
- **Props:**
  - `onSaveVisit: () => void`
  - `onSaveRecommendations: () => void`
  - `onDeleteVisit?: () => void`
  - `isSaving: boolean`
  - `isEditMode: boolean`

## 5. Types

### `VisitDto` (from API)
```typescript
interface VisitDto {
  id: string; // UUID
  patientId: string; // UUID
  visitDate: string; // ISO 8601 DateTimeOffset
  description: string;
  recommendations: string | null;
  therapistId: string; // UUID
  etag: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

### `VisitFormData` (Local State)
```typescript
interface VisitFormData {
  visitDate: Date;
  description: string;
  recommendations: string;
}
```

### `VisitFormViewModel` (from Custom Hook)
```typescript
interface VisitFormViewModel {
  // State
  formData: VisitFormData;
  isEditMode: boolean;
  isLoading: boolean; // Loading initial visit data
  isGenerating: boolean; // AI generation in progress
  isSaving: boolean; // Saving visit or recommendations
  error: Error | null;
  etag: string | null; // For concurrency control in edit mode

  // Actions
  setFormField: (field: keyof VisitFormData, value: any) => void;
  handleSaveVisit: () => Promise<void>;
  handleGenerateRecommendations: () => Promise<void>;
  handleSaveRecommendations: () => Promise<void>;
  handleDeleteVisit: () => Promise<void>;
}
```

## 6. State Management
State will be managed within the `VisitFormPage` container using a dedicated custom hook: `useVisitFormViewModel`.

**`useVisitFormViewModel(patientId?: string, visitId?: string)`:**
- **Purpose:** To encapsulate all business logic, state, and API interactions for the visit form. It will handle data fetching, state updates, and action dispatches.
- **Internal State:**
  - `useState` for `formData`, `isLoading`, `isGenerating`, `isSaving`, `error`, and `etag`.
  - `useParams` from `react-router-dom` to get `patientId` and `visitId`.
  - `useNavigate` for redirection after save/delete.
- **Logic:**
  - An effect (`useEffect`) will fetch the visit data if `visitId` is present, populating the form and storing the `etag`.
  - It will expose memoized handler functions (`handleSaveVisit`, etc.) that use `react-query` mutations to interact with the API.

## 7. API Integration
We will use `react-query` (`@tanstack/react-query`) for all server-state management.

- **`useVisitDetails(visitId)`:**
  - **Query:** `GET /api/visits/{visitId}`
  - **Action:** A `useQuery` hook to fetch data for an existing visit. Enabled only when `visitId` is present.
  - **Response:** `VisitDto`. On success, the data populates the `VisitFormData` state.

- **`useCreateVisit()`:**
  - **Mutation:** `POST /api/patients/{patientId}/visits`
  - **Action:** A `useMutation` hook.
  - **Request Body:** `{ description: string, visitDate: string }`
  - **Response:** `VisitDto`. On success, navigates to the patient details page and invalidates relevant queries.

- **`useUpdateVisit()`:**
  - **Mutation:** `PATCH /api/visits/{visitId}`
  - **Action:** A `useMutation` hook.
  - **Request Body:** `{ description: string, visitDate: string }`
  - **Headers:** Must include `If-Match: "etag-value"`.
  - **Response:** `VisitDto`. On success, shows a toast notification.

- **`useGenerateRecommendations()`:**
  - **Mutation:** `POST /api/visits/{visitId}/ai-generation`
  - **Action:** A `useMutation` hook.
  - **Request Body:** `{ model: string, prompt: string }` (The prompt will be the `description` from the form).
  - **Response:** `VisitAiGenerationCreatedDto`. On success, updates the `recommendations` field in the form state.

- **`useSaveRecommendations()`:**
  - **Mutation:** `POST /api/visits/{visitId}/recommendations`
  - **Action:** A `useMutation` hook.
  - **Request Body:** `{ recommendations: string }`
  - **Response:** `VisitDto`. On success, shows a toast notification and updates the local `etag`.

## 8. User Interactions
- **Typing in Description:** The `onChange` event updates the `description` in `formData`. The "Generate AI" button becomes enabled after the text exceeds a minimum length.
- **Clicking "Generate AI Recommendations":** Triggers the `handleGenerateRecommendations` function. The button is disabled, and a spinner appears. On success, the `recommendations` field is populated. On failure, an error toast is shown.
- **Editing Recommendations:** The user can freely edit the text in the `recommendations` field.
- **Clicking "Save Recommendations":** Triggers `handleSaveRecommendations`. A saving indicator is shown. On success, a confirmation toast appears.
- **Clicking "Save Visit":** Triggers `handleSaveVisit`. In create mode, it creates a new visit and redirects. In edit mode, it updates the existing visit.
- **Changing Date:** Updates the `visitDate` in `formData`.

## 9. Conditions and Validation
- **AI Generation:** The "Generate AI Recommendations" button is disabled if `description.length < 50` or `isGenerating` is true.
- **Saving:** All action buttons ("Save Visit", "Save Recommendations") are disabled if `isSaving` is true to prevent double submission.
- **Required Fields:** The `visitDate` and `description` fields are mandatory for saving the visit. The form submission will be blocked if they are empty.
- **Edit Mode:** The form is disabled (`isLoading`) until the initial visit data has been fetched. The `ETag` from the fetched data must be sent with `PATCH` requests.

## 10. Error Handling
- **API Errors (4xx/5xx):** All `react-query` mutations will have `onError` handlers. Errors will be displayed to the user via a non-intrusive toast notification (e.g., "Failed to save visit. Please try again.").
- **Concurrency Conflict (409 Conflict):** When updating a visit, a 409 error indicates a stale `ETag`. The user will be notified that the data has been modified by someone else and will be prompted to reload the data to see the latest version.
- **Validation Errors (422 Unprocessable Entity):** Server-side validation errors will be displayed as specific error messages next to the relevant form fields.
- **Network Errors:** A generic "Network error" message will be shown if the client cannot reach the server.

## 11. Implementation Steps
1.  **Create File Structure:** Create the necessary files: `VisitFormPage.tsx`, `useVisitFormViewModel.ts`, and individual component files (`VisitDatePicker.tsx`, etc.) in the appropriate `pages`, `hooks`, and `components` directories.
2.  **Define Types:** Add the `VisitDto`, `VisitFormData`, and `VisitFormViewModel` types to a shared `types` file.
3.  **Implement API Services:** Create functions for each API call (e.g., `createVisit`, `getVisitById`) that will be used by `react-query`.
4.  **Build the Custom Hook (`useVisitFormViewModel`):**
    - Set up the internal state management (`useState`).
    - Implement the `useEffect` for fetching data in edit mode using `useQuery`.
    - Implement the mutation hooks (`useMutation`) for all create, update, and generate actions.
    - Wire the `onSuccess` and `onError` callbacks for mutations to handle navigation and toast notifications.
5.  **Develop UI Components:** Create each of the stateless child components (`VisitForm`, `VisitDatePicker`, etc.), ensuring they correctly receive props and emit events.
6.  **Assemble the `VisitFormPage` Container:**
    - Instantiate the `useVisitFormViewModel` hook.
    - Pass the state and action handlers from the ViewModel down to the child components as props.
    - Lay out the components according to the design.
7.  **Set Up Routing:** Add the new routes (`/patients/:patientId/visits/new` and `/patients/:patientId/visits/:visitId`) to the main router configuration file, wrapping them in the `PrivateRoute` component.
