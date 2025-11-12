# Patients List View Implementation Plan

## 1. Overview
This document outlines the implementation plan for the Patients List view. The purpose of this view is to display a paginated and searchable list of patients assigned to the authenticated therapist. It serves as the main dashboard after login, allowing the user to view patient summaries, search for specific patients, and navigate to add a new patient or view a patient's detailed profile.

## 2. View Routing
The Patients List view will be accessible at the following protected route:
- **Path:** `/patients`

## 3. Component Structure
The view will be composed of several hierarchical components:

```
- PatientsPage (Container Component)
  - HeaderComponent
    - SearchBoxComponent
    - PrimaryButton ("Add Patient")
  - PatientsListComponent
    - Shimmer (while loading)
    - DetailsList (displays patient data)
  - PaginationComponent
```

## 4. Component Details

### PatientsPage
- **Description:** The main container for the view. It orchestrates data fetching, state management, and renders the child components.
- **Main Elements:** `div` containers for layout, `HeaderComponent`, `PatientsListComponent`, `PaginationComponent`.
- **Supported Interactions:** Handles the logic for search, pagination, and sorting changes, triggering API refetches.
- **Validation Conditions:** None at this level.
- **Types:** `usePatientsViewModel`
- **Props:** None.

### HeaderComponent
- **Description:** A layout component containing the search input and the "Add Patient" button.
- **Main Elements:** `SearchBox` (Fluent UI), `PrimaryButton` (Fluent UI).
- **Supported Interactions:**
  - `onSearch`: Emits the search query to the parent.
  - `onAddPatient`: Navigates to the "add patient" page.
- **Validation Conditions:** None.
- **Types:** None.
- **Props:**
  - `onSearch: (query: string) => void`
  - `onAddPatient: () => void`

### PatientsListComponent
- **Description:** Renders the list of patients using Fluent UI's `DetailsList`. It displays a `Shimmer` component while data is being fetched.
- **Main Elements:** `DetailsList`, `Shimmer`.
- **Supported Interactions:**
  - `onItemClick`: Handles row clicks to navigate to the patient's detail page.
  - `onColumnHeaderClick`: Handles sorting when a column header is clicked.
- **Validation Conditions:** None.
- **Types:** `PatientListItem`, `IColumn`
- **Props:**
  - `items: PatientListItem[]`
  - `isLoading: boolean`
  - `onSort: (sortField: string, isAscending: boolean) => void`

### PaginationComponent
- **Description:** Manages the pagination controls for the patient list.
- **Main Elements:** Buttons or a dedicated pagination component for "Previous" and "Next" pages, and page number indicators.
- **Supported Interactions:**
  - `onPageChange`: Emits the new page number to the parent.
- **Validation Conditions:** "Previous" button is disabled on the first page. "Next" button is disabled on the last page.
- **Types:** None.
- **Props:**
  - `currentPage: number`
  - `totalPages: number`
  - `onPageChange: (page: number) => void`

## 5. Types

### DTOs (Data Transfer Objects)

**`PatientListItemDto`** (from backend)
```typescript
interface PatientListItemDto {
  id: string; // GUID
  firstName: string;
  lastName: string;
  lastVisitDate: string | null; // ISO 8601 date string or null
  visitsCount: number;
}
```

**`PaginatedResponseDto<T>`** (from backend)
```typescript
interface PaginatedResponseDto<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
```

### ViewModels

**`PatientListItem`** (for UI rendering)
```typescript
interface PatientListItem {
  id: string;
  firstName: string;
  lastName: string;
  lastVisitDate: string; // Formatted for display, e.g., "DD/MM/YYYY" or "N/A"
  visitsCount: number;
}
```

## 6. State Management
State will be managed within the `PatientsPage` container using a custom hook, `usePatientsViewModel`, to encapsulate the logic.

**`usePatientsViewModel` Custom Hook:**
- **Purpose:** To manage the state for query parameters (pagination, search, sort), handle data fetching from the API, and provide the derived state to the UI.
- **State Variables:**
  - `page`: `number`
  - `pageSize`: `number`
  - `searchQuery`: `string`
  - `sortField`: `string`
  - `sortOrder`: `'asc' | 'desc'`
- **Data Fetching:** Uses React Query (`useQuery`) to fetch patient data. The query key will be an array of the state variables to ensure automatic refetching on state change.
- **Exposed Values:**
  - `patients: PatientListItem[]`
  - `isLoading: boolean`
  - `error: Error | null`
  - `pagination`: `{ currentPage, totalPages }`
  - `handleSearch: (query: string) => void` (with debouncing)
  - `handlePageChange: (page: number) => void`
  - `handleSort: (field: string) => void`

## 7. API Integration
- **Endpoint:** `GET /api/Patients`
- **Request:**
  - **Method:** `GET`
  - **Headers:** `Authorization: Bearer <token>`
  - **Query Parameters:**
    - `page: number`
    - `pageSize: number`
    - `search: string`
    - `sort: string`
    - `order: string` ('asc' or 'desc')
- **Response (Success):** `200 OK` with a body of type `PaginatedResponseDto<PatientListItemDto>`.
- **Response (Error):**
  - `401 Unauthorized`: If the token is missing or invalid.
  - `400 Bad Request`: If query parameters are invalid.
  - `502 Bad Gateway`: If there's a downstream error.

## 8. User Interactions
- **Searching:** User types in the `SearchBox`. The `onSearch` event is debounced (e.g., 300ms) before updating the `searchQuery` state, which triggers an API refetch.
- **Changing Page:** User clicks a page number or "Next"/"Previous" button in the `PaginationComponent`. The `onPageChange` event updates the `page` state, triggering a refetch.
- **Sorting:** User clicks a column header in the `DetailsList`. The `onSort` event updates the `sortField` and `sortOrder` state, triggering a refetch.
- **Viewing Details:** User clicks a row in the `DetailsList`. The application navigates to `/patients/{patientId}`.
- **Adding a Patient:** User clicks the "Add Patient" button, and the application navigates to the `/patients/new` route.

## 9. Conditions and Validation
- **Search Input:** No specific validation, but the `search` query parameter is only sent to the API if the `searchQuery` state is not empty.
- **Pagination:** The "Previous" button in the `PaginationComponent` is disabled when `currentPage` is 1. The "Next" button is disabled when `currentPage` equals `totalPages`.
- **Authentication:** The entire view is protected. Unauthenticated users will be redirected to the `/login` page.

## 10. Error Handling
- **Loading State:** While `isLoading` is `true`, the `PatientsListComponent` will display a `Shimmer` skeleton loader instead of the `DetailsList`.
- **API Errors:** If the `useQuery` hook returns an error state:
  - A `MessageBar` component will be displayed at the top of the page with a user-friendly error message (e.g., "Failed to load patients. Please try again later.").
  - The list area will show a message like "No patients found."
- **Empty State:** If the API returns an empty `items` array, the `DetailsList` will display a message in its body: "No patients found. Click 'Add Patient' to get started."

## 11. Implementation Steps
1.  **Create Folder Structure:** Create the necessary folders for the new components: `src/pages/PatientsPage`, `src/components/patients/`.
2.  **Type Definitions:** Define the DTO and ViewModel types in a shared types file (e.g., `src/types/patient.ts`).
3.  **API Service:** Create or update an API service function to handle the `GET /api/Patients` call, including passing the auth token and query parameters.
4.  **`usePatientsViewModel` Hook:** Implement the custom hook to manage state and data fetching with React Query. Include logic for debouncing the search input.
5.  **Child Components:** Build the stateless child components: `HeaderComponent`, `PatientsListComponent`, and `PaginationComponent`.
6.  **`PatientsPage` Container:** Assemble the `PatientsPage`, integrate the `usePatientsViewModel` hook, and pass down props and callbacks to the child components.
7.  **Routing:** Add the protected route for `/patients` in the main router file (e.g., `App.tsx`), ensuring it's only accessible to authenticated users.
8.  **Styling:** Apply styling using Tailwind CSS and ensure components are responsive.
