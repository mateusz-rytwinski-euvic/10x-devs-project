import type { Locator, Page } from '@playwright/test';

/**
 * Common helpers shared across multiple page objects.
 * Encapsulates base navigation and app-level selectors to avoid duplication.
 */
export class CommonPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigates to the root path and waits for the router to settle.
   */
  async gotoRoot() {
    await this.page.goto('/', { waitUntil: 'networkidle' });
  }

  /**
   * Returns the heading that describes the login hero content.
   */
  loginHeroHeading(): Locator {
    return this.page.getByRole('heading', {
      level: 1,
      name: 'Twój cyfrowy asystent terapii pacjentów',
    });
  }

  /**
   * Waits until navigation reaches a target URL fragment.
   */
  async waitForUrl(pathFragment: string) {
    await this.page.waitForURL((url) => url.pathname.includes(pathFragment));
  }

  /**
   * Returns the logout button displayed in the header when the user is authenticated.
   */
  logoutButton(): Locator {
    return this.page.getByRole('button', { name: 'Wyloguj' });
  }

  /**
   * Performs the logout interaction through the header control.
   */
  async logout() {
    await this.logoutButton().click();
  }
}
