---
applyTo: '**/*.cs'
---

# Coding Style

## General Guidelines
- Follow the official Microsoft .NET C# coding conventions: https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions
- Prefer clarity and readability over brevity.
- Use consistent formatting and naming throughout the codebase.

## Naming Conventions
- Use `PascalCase` for class, method, and property names.
- Use `camelCase` for local variables and method parameters.
- Use `ALL_CAPS` for constants.
- Prefix interfaces with `I` (e.g., `IOrderService`).
- Use meaningful, descriptive names; avoid abbreviations.

## Formatting
- Use 4 spaces for indentation (no tabs).
- Use file-scoped namespaces to simplify structure and improve readability.
- Add a blank line between method definitions.
- Place opening braces on a new line for methods, properties, and types
- All new files cannot use file-scoped namespaces. Refactor existing files during updates or maintenance.

## Variable Declaration
- Use `var` for local variable declarations when the type is obvious.
- Prefer explicit types if it improves clarity.

### Example
```csharp
// Before
int x = 1;
double y = 2.0;
string z = "Hello";
ProductBacklogItem item = new ProductBacklogItem("Test", "Test", 1, 1, 1);
// After
var x = 1;
var y = 2.0;
var z = "Hello";
var item = new ProductBacklogItem("Test", "Test", 1, 1, 1);
```

## Use Nameof with Exceptions
- When throwing exceptions, use `nameof` to refer to the parameter name instead of hardcoding it.

### Example
```csharp
// Before
throw new ArgumentNullException("parameterName");
// After
throw new ArgumentNullException(nameof(parameterName));
```

## Code Structure
- One type per file (class, interface, enum, etc.).
- Organize files by feature/domain when possible.
- Group using directives at the top of the file, outside the namespace.
- Place related types in the same namespace.
- Use partial classes only when necessary (e.g., for code generation).

## Comments & Documentation
- Use XML documentation comments (`///`) for public APIs.
- Write comments to explain why, not what, when necessary.

## Null Checks & Exceptions
- Use guard clauses for argument validation.
- Use `nameof` for parameter names in exceptions.
- Prefer `ArgumentNullException.ThrowIfNull` for null checks in recent .NET versions.

## Modern C# Features
- Use pattern matching and expression-bodied members where appropriate.
- Prefer object and collection initializers.

# References
- Adhere to Microsoft's [coding conventions](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions).