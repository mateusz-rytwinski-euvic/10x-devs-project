# Login View Implementation Plan

## 1. Overview
The Login view is a public-facing route that enables registered therapists to authenticate themselves and gain access to the application's protected features. It consists of a simple form with fields for an email address and password. Upon successful authentication, the user's session is established, and they are redirected to the main dashboard (Patients List). The view must provide clear feedback for both successful and unsuccessful login attempts.

## 2. View Routing
The Login view will be accessible at the following path:
- **Path:** `/login`

This route should be publicly accessible. If an already authenticated user attempts to access this page, they should be redirected to the main application dashboard (`/patients`).

## 3. Component Structure
The view will be composed of a main page component that orchestrates the form and its child components.

```
LoginPage (Page Component)
└── LoginForm (Container Component)
    ├── EmailField (Presentation Component - FluentUI TextField)
    ├── PasswordField (Presentation Component - FluentUI TextField)
    ├── SubmitButton (Presentation Component - FluentUI PrimaryButton)
    └── ErrorMessage (Presentation Component - FluentUI MessageBar)
```

## 4. Component Details

### `LoginPage`
- **Description:** A page-level component that renders the `LoginForm` and handles the logic for redirecting authenticated users.
- **Main Elements:** Renders the `LoginForm` component, typically centered on the page.
- **Supported Interactions:** None directly. It orchestrates the main view layout.
- **Validation:** None.
- **Types:** None.
- **Props:** None.

### `LoginForm`
- **Description:** A smart component that manages the state of the login form, handles user input, performs validation, and triggers the API call for authentication.
- **Main Elements:** An HTML `<form>` element containing the `EmailField`, `PasswordField`, `SubmitButton`, and `ErrorMessage` components.
- **Supported Interactions:**
    - `onSubmit`: Triggered when the form is submitted. It prevents the default form submission, validates the inputs, and calls the authentication service.
- **Validation:**
    - **Email:** Must be a non-empty string and a valid email format.
    - **Password:** Must be a non-empty string.
- **Types:** `LoginViewModel`, `AuthLoginCommand`, `AuthSessionDto`.
- **Props:** None.

### `EmailField`, `PasswordField`
- **Description:** Presentational components wrapping FluentUI's `TextField`. They are responsible for rendering the input fields for email and password.
- **Main Elements:** `<TextField>` from FluentUI.
- **Supported Interactions:**
    - `onChange`: Emits the new value to the parent `LoginForm` to update the state.
- **Validation:** Displays error messages passed down from `LoginForm` when validation rules are not met.
- **Types:** `string`.
- **Props:**
    - `value: string`
    - `onChange: (newValue: string) => void`
    - `errorMessage?: string`
    - `disabled: boolean`

### `SubmitButton`
- **Description:** A presentational component wrapping FluentUI's `PrimaryButton`. It is used to submit the login form.
- **Main Elements:** `<PrimaryButton>` from FluentUI.
- **Supported Interactions:**
    - `onClick`: Triggers the form's `onSubmit` event.
- **Validation:** None.
- **Types:** None.
- **Props:**
    - `disabled: boolean`: Should be `true` while the form is submitting to prevent multiple submissions.
    - `children: React.ReactNode`: The button text (e.g., "Login").

### `ErrorMessage`
- **Description:** A presentational component wrapping FluentUI's `MessageBar`. It displays API or form-level error messages to the user.
- **Main Elements:** `<MessageBar>` from FluentUI.
- **Supported Interactions:** None.
- **Validation:** None.
- **Types:** None.
- **Props:**
    - `message: string | null`: The error message to display. The component is hidden if the message is null or empty.

## 5. Types

### `LoginViewModel`
This interface represents the state of the form data within the `LoginForm` component.
```typescript
interface LoginViewModel {
  email: string;
  password: string;
}
```

### `AuthLoginCommand` (Request DTO)
This interface matches the backend's expected request payload for the login endpoint.
```typescript
interface AuthLoginCommand {
  email: string;
  password: string;
}
```

### `AuthSessionDto` (Response DTO)
This interface represents the successful response from the login API endpoint.
```typescript
interface AuthSessionDto {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  // Note: The 'profile' object is not included in the login response per AuthController.cs
}
```

## 6. State Management
State will be managed using a combination of local component state and a custom hook for authentication logic.

- **`useLogin` (Custom Hook):** This hook will encapsulate the logic for the login form.
    - **State:**
        - `formData: LoginViewModel`: Stores the current email and password.
        - `errors: { email?: string; password?: string; api?: string }`: Stores validation and API error messages.
        - `isLoading: boolean`: Tracks the submission status to disable the form.
    - **Actions:**
        - `handleInputChange`: A function to update `formData`.
        - `handleSubmit`: A function that performs validation and calls the API mutation.
    - **API Mutation:** It will use `useMutation` from React Query to handle the POST request to `/api/auth/login`.

- **`useAuth` (Global Auth Context):** A global context will be used to store the user's session (`AuthSessionDto`) and authentication status. The `useLogin` hook will call a function from this context (e.g., `login(session)`) upon a successful API response to update the global state.

## 7. API Integration
- **Endpoint:** `POST /api/auth/login`
- **Tool:** React Query's `useMutation` hook will be used to handle the asynchronous login request.
- **Request Payload:** The `handleSubmit` function in the `useLogin` hook will construct an `AuthLoginCommand` object from the form's state.
- **Success Response:** On a `200 OK` response, the `onSuccess` callback of `useMutation` will be triggered. It will receive the `AuthSessionDto` payload. This data will be stored in the global `AuthContext`, and the user will be programmatically redirected to `/patients`.
- **Error Response:** The `onError` callback will handle API errors. It will parse the error response and update the `errors.api` state in the `useLogin` hook, which will then be displayed in the `ErrorMessage` component.

## 8. User Interactions
1.  **Typing in Fields:** The user types their email and password. The `onChange` events update the `formData` state in the `useLogin` hook.
2.  **Submitting the Form:** The user clicks the "Login" button or presses Enter.
    - The `handleSubmit` function is called.
    - Input validation is performed. If invalid, the `errors` state is updated, and error messages are displayed next to the respective fields.
    - If valid, the `isLoading` state is set to `true`, and the form controls are disabled.
    - The API mutation is triggered.
3.  **Successful Login:**
    - The API returns a `200 OK` status with the `AuthSessionDto`.
    - `isLoading` is set to `false`.
    - The session is stored globally via `AuthContext`.
    - The user is redirected to the `/patients` route.
4.  **Failed Login:**
    - The API returns an error status (e.g., 400, 401).
    - `isLoading` is set to `false`.
    - The form controls are re-enabled.
    - The `errors.api` state is updated with a user-friendly message (e.g., "Invalid email or password.").
    - The `ErrorMessage` component displays the error.

## 9. Conditions and Validation
- **Email Validation:**
    - **Condition:** The email field must not be empty and must match a standard email regex pattern.
    - **Component:** `LoginForm` (logic), `EmailField` (display).
    - **UI Effect:** If invalid, an error message is shown below the `EmailField`, and form submission is blocked.
- **Password Validation:**
    - **Condition:** The password field must not be empty.
    - **Component:** `LoginForm` (logic), `PasswordField` (display).
    - **UI Effect:** If invalid, an error message is shown below the `PasswordField`, and form submission is blocked.
- **Submission Lock:**
    - **Condition:** The form is currently submitting (`isLoading` is `true`).
    - **Component:** `LoginForm`, `EmailField`, `PasswordField`, `SubmitButton`.
    - **UI Effect:** All form inputs and the submit button are disabled to prevent duplicate requests. A spinner can be shown on the button.

## 10. Error Handling
- **Invalid Input (Client-Side):** Handled by the `useLogin` hook. Error messages are displayed inline for the specific fields that are invalid.
- **Invalid Credentials (`401 Unauthorized`):** The API will return a 401 status. The `onError` handler in `useMutation` will catch this and set a generic error message like "Invalid email or password." in the `ErrorMessage` component.
- **Bad Request (`400 Bad Request`):** This could happen if the payload is malformed. It will be handled similarly to the 401 error, displaying a generic error message.
- **Server/Gateway Error (`502 Bad Gateway`):** If the backend cannot communicate with Supabase, a 502 error is returned. This should be handled by displaying a generic message like "The service is temporarily unavailable. Please try again later."

## 11. Implementation Steps
1.  **Create File Structure:** Create the necessary files: `src/pages/LoginPage.tsx`, `src/components/auth/LoginForm.tsx`, and `src/hooks/useLogin.ts`.
2.  **Define Types:** Create or update a `types/auth.ts` file with the `LoginViewModel`, `AuthLoginCommand`, and `AuthSessionDto` interfaces.
3.  **Set Up Routing:** In the main router file (e.g., `App.tsx`), add a new public route for `/login` that renders the `LoginPage` component. Implement logic to redirect authenticated users away from this page.
4.  **Build `LoginPage`:** Create the `LoginPage` component, which provides the page layout and renders the `LoginForm`.
5.  **Implement `useLogin` Hook:**
    - Set up the state for `formData`, `errors`, and `isLoading`.
    - Implement the `useMutation` call to `POST /api/auth/login`.
    - Implement `onSuccess` and `onError` handlers for the mutation.
    - Create the `handleInputChange` and `handleSubmit` functions.
6.  **Build `LoginForm` Component:**
    - Use the `useLogin` hook to manage state and actions.
    - Construct the form using FluentUI's `TextField` and `PrimaryButton`.
    - Bind the state, event handlers, and error messages to the form elements.
    - Implement the disabled state based on `isLoading`.
    - Add the `MessageBar` component to display API errors.
7.  **Integrate with Auth Context:** Ensure the `onSuccess` handler in `useLogin` correctly calls the function from `AuthContext` to update the global session state.
8.  **Styling:** Use Tailwind CSS for layout and positioning of the form on the page, ensuring it is responsive and visually appealing.
