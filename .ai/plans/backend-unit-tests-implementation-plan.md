# Backend Unit Tests Implementation Plan

This document outlines the plan for implementing unit tests for the `10xPhysio.Server` backend.

## 1. Test Project Setup

- **Create Test Project**: Create a new xUnit test project named `10xPhysio.Server.Tests` within the solution.
- **Add Project Reference**: Add a reference to the `10xPhysio.Server` project.
- **Install NuGet Packages**: Install the following packages:
    - `xunit`
    - `xunit.runner.visualstudio`
    - `Moq`
    - `FluentAssertions`
    - `Microsoft.AspNetCore.Mvc.Testing` for integration tests.

## 2. Test Structure

- **Mirror Project Structure**: The test project's folder structure should mirror the main project's structure to keep tests organized and easy to locate.
    ```
    10xPhysio.Server.Tests/
    ├── Controllers/
    │   ├── AuthControllerTests.cs
    │   └── PatientsControllerTests.cs
    ├── Services/
    │   ├── AuthServiceTests.cs
    │   └── PatientsServiceTests.cs
    └── Middleware/
        └── ExceptionHandlingMiddlewareTests.cs
    ```

## 3. Scope of Testing

### Controllers

- **`AuthController`**:
    - Mock `IAuthService`.
    - Test `Login` endpoint:
        - Valid credentials should return `OkObjectResult` with a token.
        - Invalid credentials should return `UnauthorizedObjectResult`.
    - Test `SignUp` endpoint:
        - Successful registration should return `OkObjectResult`.
        - Existing user should return `ConflictObjectResult`.

- **`PatientsController`**:
    - Mock `IPatientsService`.
    - Test `GetPatients`: Verify it returns a list of patients.
    - Test `GetPatientById`:
        - Existing ID should return `OkObjectResult` with the patient.
        - Non-existing ID should return `NotFoundResult`.
    - Test `CreatePatient`: Valid model should return `CreatedAtActionResult`. Invalid model should return `BadRequestObjectResult`.
    - Test `UpdatePatient`:
        - Existing ID and valid model should return `NoContentResult`.
        - Non-existing ID should return `NotFoundResult`.
    - Test `DeletePatient`: Existing ID should return `NoContentResult`. Non-existing ID should return `NotFoundResult`.

- **`VisitsController`**:
    - Mock `IVisitsService`.
    - Apply similar test strategies as for `PatientsController` for all CRUD operations.

- **`ProfileController`**:
    - Mock `IProfileService`.
    - Test `GetProfile`: Verify it returns the user's profile.

- **`VisitAiGenerationsController`**:
    - Mock `IVisitAiGenerationService`.
    - Test `GenerateVisitSummary`:
        - Valid request should return `OkObjectResult` with the generated summary.
        - Invalid request should return `BadRequestObjectResult`.

### Services

- **`AuthService`**:
    - Mock `Supabase.Client` and any other external dependencies.
    - Test the logic for user authentication and registration.
    - Test token generation/validation if applicable.

- **`PatientsService`**:
    - Mock repository/database context.
    - Test business logic for creating, retrieving, updating, and deleting patients.
    - Test validation logic.

- **`VisitsService`**:
    - Mock repository/database context.
    - Test business logic for visit management.

- **`ProfileService`**:
    - Mock repository/database context.
    - Test logic for retrieving user profiles.

- **`VisitAiGenerationService`**:
    - Mock the AI service client (`HttpClient`).
    - Test the logic for preparing data and calling the AI service.
    - Test handling of responses from the AI service.

### Middleware

- **`ExceptionHandlingMiddleware`**:
    - Create a mock HTTP context and request pipeline.
    - Simulate different types of exceptions being thrown by subsequent middleware/endpoints.
    - Verify that the middleware catches the exceptions and generates the correct `ProblemDetails` response with the appropriate status code.

## 4. Implementation Steps

1.  **Setup Phase**: Complete all steps in section 1.
2.  **Controller Tests**:
    - Start with `AuthControllerTests.cs`.
    - Proceed with `PatientsControllerTests.cs`.
    - Implement tests for other controllers.
3.  **Service Tests**:
    - Start with `AuthServiceTests.cs`.
    - Proceed with `PatientsServiceTests.cs`.
    - Implement tests for other services.
4.  **Middleware Tests**: Implement `ExceptionHandlingMiddlewareTests.cs`.
5.  **Review and Refactor**: Review all tests for clarity, completeness, and adherence to best practices.

## 5. Continuous Integration

- **Configure CI Pipeline**: Set up a GitHub Actions workflow (or other CI service) to build the solution and run all unit tests on demand.
- **Fail Build on Test Failure**: The CI build should fail if any test fails, preventing merging of broken code.
