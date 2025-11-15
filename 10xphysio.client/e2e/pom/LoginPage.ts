import type { Locator, Page } from '@playwright/test';

const LOGIN_PATH = '/login';

/**
 * Page object for the login experience. Wraps selectors and user interactions for the login form.
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Adres e-mail');
    this.passwordInput = page.getByLabel('Hasło');
    this.submitButton = page.getByRole('button', { name: 'Zaloguj się' });
    this.errorAlert = page.getByRole('alert');
  }

  /**
   * Direct navigation helper to the login route.
   */
  async goto() {
    await this.page.goto(LOGIN_PATH, { waitUntil: 'domcontentloaded' });
  }

  /**
   * Performs a login attempt with the provided credentials.
   */
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /**
   * Clears form inputs to prepare for another attempt.
   */
  async resetForm() {
    await this.emailInput.fill('');
    await this.passwordInput.fill('');
  }

  /**
   * Returns a locator pointing to an API error message rendered by the form.
   */
  errorMessage(text: string): Locator {
    return this.page.getByText(text, { exact: false });
  }
}
