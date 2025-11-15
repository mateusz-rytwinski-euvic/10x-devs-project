import type { Locator, Page } from '@playwright/test';

const PATIENTS_PATH = '/patients';

/**
 * Page object representing the patients dashboard. Encapsulates table interactions and header controls.
 */
export class PatientsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly addPatientButton: Locator;
  readonly searchInput: Locator;
  readonly table: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: 'Panel pacjentów' });
    this.addPatientButton = page.getByRole('button', { name: 'Dodaj pacjenta' });
    this.searchInput = page.getByRole('searchbox', { name: 'Wyszukaj pacjenta' });
    this.table = page.locator('[aria-label="Lista pacjentów"]');
    this.emptyState = page.getByText('Brak pacjentów');
  }

  /**
   * Navigates directly to the patients route.
   */
  async goto() {
    await this.page.goto(PATIENTS_PATH, { waitUntil: 'networkidle' });
  }

  /**
   * Triggers the add patient flow.
   */
  async clickAddPatient() {
    await this.addPatientButton.click();
  }

  /**
   * Types a query into the search box.
   */
  async search(query: string) {
    await this.searchInput.fill(query);
  }

  /**
   * Returns the data rows within the patients table.
   */
  rows(): Locator {
    return this.table.locator('tbody tr');
  }

  patientRow(fullName: string): Locator {
    return this.rows().filter({ hasText: fullName });
  }
}
