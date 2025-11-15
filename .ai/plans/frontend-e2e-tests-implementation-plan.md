# Frontend E2E Tests Implementation Plan

This document outlines the plan for implementing end-to-end (E2E) tests for the frontend of the 10xPhysio application using Playwright.

## 1. Playwright Setup and Configuration

- **Install Playwright:** Add Playwright as a dev dependency to the `10xphysio.client` project.
  ```bash
  npm install -D @playwright/test
  ```
- **Initialize Playwright:** Run the Playwright init command to generate the basic configuration file (`playwright.config.ts`) and example tests.
  ```bash
  npx playwright install
  ```
- **Configure Playwright:** Adjust `playwright.config.ts` to:
    - Set the `baseURL` to the development server URL.
    - Configure browsers to run tests against (e.g., Chromium, Firefox, WebKit).
    - Define test directories.
    - Set up reporting options.

## 2. Test Structure

Create a clear and scalable folder structure for the E2E tests within the `10xphysio.client` directory.

```
e2e/
├── tests/
│   ├── auth.spec.ts
│   └── patients.spec.ts
├── pom/
│   ├── LoginPage.ts
│   ├── PatientsPage.ts
│   └── Common.ts
├── fixtures/
│   └── auth.fixtures.ts
└── utils/
    └── test-data.ts
```

- `tests/`: Contains the test files (specs).
- `pom/`: Contains Page Object Models for different pages of the application.
- `fixtures/`: For custom test fixtures (e.g., for handling authentication state).
- `utils/`: For utility functions and test data.

## 3. First Test Implementation

- **Create a simple test:** Write a "smoke" test to ensure the setup is working correctly. For example, a test that navigates to the home page and checks if the title is correct.
- **Run the test:** Execute the test using the Playwright CLI to verify the setup.
  ```bash
  npx playwright test
  ```

## 4. Develop Page Object Models (POMs)

- **Identify pages:** List the main pages of the application (e.g., Login, Dashboard, Patients List, Patient Details).
- **Create POM classes:** For each page, create a class that encapsulates the selectors and actions for that page. This will make the tests cleaner, more readable, and easier to maintain.

**Example `LoginPage.ts`:**
```typescript
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('input[name="username"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.loginButton = page.locator('button[type="submit"]');
  }

  async login(username, password) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
```

## 5. Writing Tests for Key User Flows

- **Authentication:**
    - Test successful login.
    - Test login with invalid credentials.
    - Test logout.
- **Patient Management:**
    - Test viewing the list of patients.
    - Test creating a new patient.
    - Test searching for a patient.
    - Test viewing a patient's details.
    - Test editing a patient's details.
- **Visits:**
    - Test creating a new visit for a patient.
    - Test viewing visit details.
    - Test using the AI generation feature for visit notes.

## 6. CI/CD Integration

- **Create a new workflow:** Add a new GitHub Actions workflow file (e.g., `.github/workflows/e2e-tests.yml`).
- **Configure the workflow:**
    - The workflow will be triggered manually using `workflow_dispatch`.
    - Set up a job to build the frontend application.
    - Add a step to run the Playwright tests.
    - Configure the action to upload the test report as an artifact.

**Example CI step:**
```yaml
on: workflow_dispatch

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      - name: Run Playwright tests
        run: npx playwright test
      - name: Upload report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```
