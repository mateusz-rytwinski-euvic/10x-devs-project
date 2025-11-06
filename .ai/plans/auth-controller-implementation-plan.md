# API Endpoint Implementation Plan: Auth Controller

## 1. Endpoint Overview
The `AuthController` will manage the user (therapist) session lifecycle by integrating with the Supabase GoTrue service. It will expose four endpoints that act as a proxy for registration, login, logout, and current session verification operations. All operations will be secured and validated according to best practices.

## 2. Request and Response Details

### 2.1. New User Registration
- **Description**: Creates a new user in Supabase and their associated profile in the `profiles` table.
- **HTTP Method**: `POST`
- **URL Structure**: `/api/auth/signup`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password123",
    "firstName": "John",
    "lastName": "Doe"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "message": "account_created"
  }
  ```

### 2.2. User Login
- **Description**: Authenticates the user and returns session tokens.
- **HTTP Method**: `POST`
- **URL Structure**: `/api/auth/login`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password123"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "accessToken": "ey...",
    "refreshToken": "ey...",
    "expiresIn": 3600,
    "user": {
      "id": "uuid-goes-here",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    }
  }
  ```

### 2.3. User Logout
- **Description**: Invalidates the session tokens for the logged-in user.
- **HTTP Method**: `POST`
- **URL Structure**: `/api/auth/logout`
- **Request Body**: None (operation based on `Authorization: Bearer <JWT>`).
- **Success Response (200 OK)**:
  ```json
  {
    "message": "session_revoked"
  }
  ```

### 2.4. Get Session Data
- **Description**: Verifies the token and returns the logged-in user's data.
- **HTTP Method**: `GET`
- **URL Structure**: `/api/auth/session`
- **Request Body**: None (operation based on `Authorization: Bearer <JWT>`).
- **Success Response (200 OK)**:
  ```json
  {
    "id": "uuid-goes-here",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
  ```

## 3. Used Types
- **Command Models**:
  - `AuthSignupCommand`: `Email`, `Password`, `FirstName`, `LastName`
  - `AuthLoginCommand`: `Email`, `Password`
- **DTOs**:
  - `AuthSessionDto`: `AccessToken`, `RefreshToken`, `ExpiresIn`, `User` (containing `Id`, `Email`, `FirstName`, `LastName`)
  - `SessionSnapshotDto`: `Id`, `Email`, `FirstName`, `LastName`
  - `OperationMessageDto`: `Message`

## 4. Data Flow
1.  **Controller (`AuthController`)**: Receives the HTTP request, deserializes the request body into the appropriate `Command` model.
2.  **Validation**: ASP.NET Core middleware automatically validates the `Command` model based on defined attributes. Returns `400 Bad Request` on failure.
3.  **Service (`IAuthService`)**: The controller calls the appropriate service method (e.g., `SignUpAsync`).
4.  **Supabase Client**: The `AuthService` uses the injected Supabase client (`Supabase.Client`) to communicate with the Supabase GoTrue API.
    - For `signup`, it passes `email`, `password`, and `firstName` and `lastName` in `UserAttributes`.
    - For `login`, it passes `email` and `password`.
    - For `logout` and `session`, it operates on the session associated with the JWT token from the request.
5.  **Database (PostgreSQL)**:
    - After a successful registration in Supabase, the `on_auth_user_created` trigger in the database automatically creates a new row in the `profiles` table using data from `UserAttributes`.
6.  **Mapping and Response**: The `AuthService` maps the response from Supabase to the appropriate DTO (`AuthSessionDto`, `SessionSnapshotDto`, `OperationMessageDto`).
7.  **Controller**: Returns the DTO to the client with the corresponding HTTP status code.

## 5. Security Considerations
- **Authentication**: The `/api/auth/logout` and `/api/auth/session` endpoints must be protected and require a valid `Authorization: Bearer <JWT>` token.
- **Validation**: All client-side input must be validated on the server-side to prevent injection attacks and ensure data consistency.
- **Password Policy**: The password for registration must be validated according to the policy: min. 8 characters, at least one uppercase letter, and one digit.
- **Rate Limiting**: A rate-limiting mechanism should be implemented for the `signup` and `login` endpoints to protect against brute-force attacks.
- **HTTPS**: All communication must be enforced over HTTPS.
- **Token Handling**: JWT tokens should be passed in the `Authorization` header. The client application is responsible for their secure storage.

## 6. Error Handling
- **Validation Errors (400 Bad Request)**: Returned automatically by the framework when input data does not meet the rules (e.g., invalid email format, password not meeting policy).
- **Unauthorized Access (401 Unauthorized)**:
  - For `login`: When an incorrect email or password is provided.
  - For `logout` and `session`: When the JWT token is invalid, expired, or missing.
- **Conflict (409 Conflict)**: Returned by `signup` when a user with the given email address already exists.
- **Bad Gateway (502 Bad Gateway)**: Returned when there is an error in communication with the Supabase API (e.g., the service is unavailable). All such errors must be logged on the server-side.

## 7. Performance Considerations
- Since the endpoints act as a proxy, their performance is directly dependent on the response time of the Supabase API.
- Response times should be monitored, and the Supabase connection configuration should be optimized if necessary.
- The Supabase client (`Supabase.Client`) should be registered in the DI container as a singleton to avoid the overhead of creating new instances with each request.

## 8. Implementation Steps
1.  **Create Models**: Implement the `AuthSignupCommand`, `AuthLoginCommand`, `AuthSessionDto`, and `SessionSnapshotDto` classes in the appropriate directories in the `10xPhysio.Server` project.
2.  **Add Validation**: Add `DataAnnotations` attributes to the `Command` models for input validation (`Email`, `Password`, `FirstName`, `LastName`).
3.  **Create Service**: Define the `IAuthService` interface and its implementation, `AuthService`, which will contain the logic for communicating with Supabase.
4.  **Register Dependencies**: Register `IAuthService` and `Supabase.Client` in the Dependency Injection container in `Program.cs`.
5.  **Implement Controller**: Create the `AuthController` with four actions (`SignUp`, `Login`, `Logout`, `GetSession`).
6.  **Inject Service**: Inject `IAuthService` into the `AuthController` and call its methods in the respective actions.
7.  **Error Handling**: Add a global exception filter or middleware to catch exceptions from the Supabase client and map them to the appropriate HTTP status codes (e.g., `409`, `502`).
8.  **Configure Authorization**: Configure JWT authentication in `Program.cs` to protect the `logout` and `session` endpoints.
9.  **Add Rate Limiting**: Implement a rate-limiting policy for the `signup` and `login` endpoints using ASP.NET Core's built-in mechanisms.
