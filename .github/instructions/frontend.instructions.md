---
applyTo: '**/*.ts?(x)'
---

# Frontend Coding Style

## REACT_CODING_STANDARDS

- Use functional components with hooks instead of class components
- Implement React.memo() for expensive components that render often with the same props
- Utilize React.lazy() and Suspense for code-splitting and performance optimization
- Use the useCallback hook for event handlers passed to child components to prevent unnecessary re-renders
- Prefer useMemo for expensive calculations to avoid recomputation on every render
- Implement useId() for generating unique IDs for accessibility attributes
- Use the new use hook for data fetching in React 19+ projects
- Leverage Server Components for {{data_fetching_heavy_components}} when using React with Next.js or similar frameworks
- Consider using the new useOptimistic hook for optimistic UI updates in forms
- Use useTransition for non-urgent state updates to keep the UI responsive

Key Principles
- Use functional, declarative programming. Avoid classes.
- Use descriptive variable names with auxiliary verbs (e.g., isLoading, hasError).
- Favor named exports for components.
- Use TypeScript for all code. Prefer interfaces over types.
- File structure: imports, types, main component, subcomponents, helpers, static content.
- Use Zod for form validation.
- Use Zustand for state management.
- Use Fluent UI and Tailwind CSS for components and styling.

# Guidelines for STYLING

## TAILWIND

- Use the @layer directive to organize styles into components, utilities, and base layers
- Implement Just-in-Time (JIT) mode for development efficiency and smaller CSS bundles
- Use arbitrary values with square brackets (e.g., w-[123px]) for precise one-off designs
- Leverage the @apply directive in component classes to reuse utility combinations
- Implement the Tailwind configuration file for customizing theme, plugins, and variants
- Use component extraction for repeated UI patterns instead of copying utility classes
- Leverage the theme() function in CSS for accessing Tailwind theme values
- Implement dark mode with the dark: variant
- Use responsive variants (sm:, md:, lg:, etc.) for adaptive designs
- Leverage state variants (hover:, focus:, active:, etc.) for interactive elements

## FLUENTUI
- Use FluentUI React components for consistent design and accessibility
- Leverage FluentUI theming capabilities to customize component styles
- Implement FluentUI's styling system for dynamic and responsive styles
- Use FluentUI's built-in accessibility features for better user experience
- Utilize FluentUI's layout components for responsive design
- Follow FluentUI's design guidelines for spacing, typography, and color usage
- Use FluentUI icons for visual consistency
- Implement FluentUI's form components for better user input handling
- Leverage FluentUI's data visualization components for charts and graphs
- Use FluentUI's localization features for multi-language support

