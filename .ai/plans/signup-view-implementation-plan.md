# Sign-Up View Implementation Plan

## 1. Overview
This document outlines the implementation plan for the Sign-Up view. The purpose of this view is to allow new physiotherapists to create an account in the 10x-Physio application by providing their personal details and credentials. Upon successful registration, the user will be redirected to the patients' dashboard.

## 2. View Routing
The Sign-Up view will be accessible at the following application path:
- **Path:** `/signup`

## 3. Component Structure
The view will be composed of a main page component that houses a dedicated form component. This promotes separation of concerns, with the form handling all state management, validation, and API interactions.

```
- SignUpPage (Route Component)
  - SignUpForm (Handles state, validation, and submission)
    - TextField (Fluent UI - for First Name)
    - TextField (Fluent UI - for Last Name)
    - TextField (Fluent UI - for Email)
    - TextField (Fluent UI - for Password)
    - PrimaryButton (Fluent UI - for form submission)
    - MessageBar (Fluent UI - for displaying API errors or success messages)
    - Spinner (Fluent UI - to indicate loading state)
```

## 4. Component Details

### SignUpPage
- **Description:** A container component rendered by the router at the `/signup` path. Its primary role is to render the `SignUpForm` and provide the overall page layout.
- **Main Elements:** A `div` container that centers the `SignUpForm` on the page.
- **Events Handled:** None.
- **Validation Conditions:** None.
- **Types:** None.
- **Props:** None.

### SignUpForm
- **Description:** A smart component responsible for managing the entire sign-up process. It holds the form's state, handles user input, performs client-side validation, and manages the API request/response lifecycle.
- **Main Elements:**
  - An HTML `<form>` element.
  - Four `TextField` components from Fluent UI for `firstName`, `lastName`, `email`, and `password`.
  - One `PrimaryButton` for submitting the form.
  - A `MessageBar` to display feedback (e.g., "Email already in use").
  - A `Spinner` to show a loading indicator while the form is being submitted.
- **Events Handled:**
  - `onChange` for each `TextField` to update the component's state.
  - `onSubmit` for the form to trigger validation and the API call.
- **Validation Conditions:**
  - **First Name:** Required, must not be empty.
  - **Last Name:** Required, must not be empty.
  - **Email:** Required, must be a valid email format.
  - **Password:** Required, must be at least 8 characters long and contain at least one uppercase letter and one number.
  - **Submit Button:** Should be disabled if any validation condition is not met or if the form is currently submitting.
- **Types:** `SignUpFormViewModel`, `AuthSignupCommand`.
- **Props:** None.

## 5. Types

### SignUpFormViewModel
This interface represents the data structure for the form's state within the `SignUpForm` component.
```typescript
interface SignUpFormViewModel {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}
```

### AuthSignupCommand (Request DTO)
This interface defines the shape of the data sent to the backend API endpoint. It mirrors the backend `AuthSignupCommand` class.
```typescript
interface AuthSignupCommand {
  firstName: string;
  lastName:string;
  email: string;
  password: string;
}
```

### OperationMessageDto (Response DTO)
This interface represents the generic success or error message returned from the API.
```typescript
interface OperationMessageDto {
  message: string;
}
```

## 6. State Management
State will be managed locally within the `SignUpForm` component using the `useState` hook for form data, loading status, and API errors. For handling the API call lifecycle (loading, error, success states), a custom hook `useSignUp` will be created.

### `useSignUp` Custom Hook
- **Purpose:** To encapsulate the logic for the sign-up API call, including state management for loading and errors, and to provide a clear function to trigger the mutation. This aligns with the React Query pattern mentioned in the architecture overview.
- **Returns:**
  - `signUp`: A function that takes `AuthSignupCommand` as an argument and executes the API call.
  - `isLoading`: A boolean indicating if the API request is in progress.
  - `error`: An object or string containing error information if the request fails.
  - `isSuccess`: A boolean indicating if the registration was successful.

## 7. API Integration
The `SignUpForm` will interact with the backend through the `useSignUp` hook.

- **Endpoint:** `POST /api/auth/signup`
- **Request Payload:** The form will send a JSON object matching the `AuthSignupCommand` interface.
- **Response Handling:**
  - **Success (201 Created):** The API returns an `OperationMessageDto`. The `useSignUp` hook will set `isSuccess` to true. The component will then redirect the user to the `/patients` page.
  - **Bad Request (400 Bad Request):** The API returns an `OperationMessageDto` with validation error details. The error message will be displayed in the `MessageBar`.
  - **Conflict (409 Conflict):** The API returns an `OperationMessageDto` (e.g., `{ "message": "user_already_registered" }`). This specific error will be displayed in the `MessageBar`.
  - **Server Error (502 Bad Gateway):** A generic error message like "An unexpected error occurred. Please try again." will be displayed in the `MessageBar`.

## 8. User Interactions
- **Typing in fields:** The component state is updated on every keystroke. Real-time validation feedback is provided (e.g., highlighting an invalid email format).
- **Clicking "Sign Up":**
  - If the form is invalid, the button is disabled or does nothing.
  - If the form is valid, the `onSubmit` event is triggered. A `Spinner` is displayed, and the button is disabled to prevent multiple submissions.
  - On API success, the user is redirected to `/patients`.
  - On API failure, the `Spinner` is hidden, the button is re-enabled, and an error message is shown in the `MessageBar`.

## 9. Conditions and Validation
- **Client-Side:**
  - All fields are required.
  - Email must match a regex for email validation.
  - Password must match the regex `^(?=.*[A-Z])(?=.*\\d).{8,}$`.
  - The "Sign Up" button's `disabled` attribute is bound to the form's validity state and the `isLoading` state from the `useSignUp` hook.
- **Server-Side:**
  - The frontend should be prepared to handle a 409 Conflict error, which indicates the email is already in use. This is a validation condition that can only be checked by the server.

## 10. Error Handling
- **Validation Errors:** Displayed inline under the respective `TextField` components or as a summary.
- **API Errors:**
  - **409 Conflict (`user_already_registered`):** Display a specific message: "This email address is already registered. Please try logging in."
  - **400 Bad Request:** Display a generic message: "Please check the entered data and try again."
  - **5xx Server Errors:** Display a generic failure message: "An unexpected error occurred. Please try again later."
- All API error messages will be rendered within a `MessageBar` component with `intent="error"`.

## 11. Implementation Steps
1.  **Create File Structure:** Create a new folder `src/pages/SignUpPage` containing `SignUpPage.tsx` and `SignUpForm.tsx`.
2.  **Implement `SignUpPage.tsx`:** Set up the basic page layout and render the `SignUpForm` component in the center.
3.  **Define Types:** Create a `src/types/auth.ts` file (if not existing) and add the `AuthSignupCommand` and `OperationMessageDto` interfaces.
4.  **Implement `SignUpForm.tsx`:**
    - Build the form layout using Fluent UI's `TextField` and `PrimaryButton`.
    - Implement local state management for form fields using `useState`.
5.  **Create `useSignUp` Hook:**
    - Create a new file `src/hooks/useSignUp.ts`.
    - Use a library like `axios` or `fetch` for the API call.
    - Implement the logic to handle loading, success, and error states for the `POST /api/auth/signup` request.
6.  **Integrate Hook and Validation:**
    - Integrate the `useSignUp` hook into `SignUpForm.tsx`.
    - Implement client-side validation logic for all fields.
    - Connect the form's `onSubmit` handler to the `signUp` function from the hook.
    - Conditionally disable the submit button based on form validity and loading state.
7.  **Implement Routing:** In `App.tsx` or the main routing file, add a new route for `/signup` that renders the `SignUpPage` component.
8.  **Handle Redirection and Errors:**
    - Use `react-router-dom`'s `useNavigate` hook to redirect the user to `/patients` on successful registration.
    - Implement the `MessageBar` to display appropriate error messages based on the `error` state from the `useSignUp` hook.
9.  **Styling:** Use Tailwind CSS utility classes to ensure the form is well-styled, centered, and responsive.
