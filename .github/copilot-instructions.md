# AI Rules for 10x-Physio

{{project-description}}

## Tech Stack

### Frontend
- Vite 7
- TypeScript 5
- React 19
- Tailwind 4
- FluentUI 2

### Backend
- .NET 8
- ASP.NET Core

## General Instructions
- Make only high confidence suggestions when reviewing code changes.
- Write code with good maintainability practices, including comments on why certain design decisions were made.
- For libraries or external dependencies, mention their usage and purpose in comments.
- Handle edge cases and write clear exception handling.
- Handle errors and edge cases at the beginning of functions.
- Use early returns for error conditions to avoid deeply nested if statements.
- Place the happy path last in the function for improved readability.
- Avoid unnecessary else statements; use if-return pattern instead.
- Use guard clauses to handle preconditions and invalid states early.
- Implement proper error logging and user-friendly error messages.

## BACKEND

### C#
- Always use the latest version C#, currently C# 13 features.
- Write clear and concise comments for each function.

### ASP_NET

- Use minimal APIs for simple endpoints in .NET 6+ applications to reduce boilerplate code
- Implement proper exception handling with ExceptionFilter or middleware to provide consistent error responses
- Use dependency injection with scoped lifetime for request-specific services and singleton for stateless services
