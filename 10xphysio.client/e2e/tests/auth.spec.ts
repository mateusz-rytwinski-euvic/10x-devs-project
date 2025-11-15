import { expect, test } from '@playwright/test';
import { CommonPage } from '../pom/Common';
import { LoginPage } from '../pom/LoginPage';
import { PatientsPage } from '../pom/PatientsPage';
import { createAuthSession, createPatientListRecord, createPatientsPage, getTestUserCredentials } from '../utils/test-data';

const AUTH_STORAGE_KEY = '10xphysio.auth.session';

test.describe('Autoryzacja', () => {
  test('pozwala zalogować się poprawnymi danymi i przekierowuje do listy pacjentów', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const patientsPage = new PatientsPage(page);
    const common = new CommonPage(page);

    const credentials = getTestUserCredentials();
    const session = createAuthSession();
    const patientsPayload = createPatientsPage([createPatientListRecord()]);

    await page.route('**/api/auth/login', async (route) => {
      const requestBody = route.request().postDataJSON() as Record<string, unknown>;

      expect(requestBody).toMatchObject({
        email: credentials.email,
        password: credentials.password,
      });

      await route.fulfill({
        status: 200,
        body: JSON.stringify(session),
        headers: { 'content-type': 'application/json' },
      });
    });

    await page.route('**/api/Patients**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify(patientsPayload),
        headers: { 'content-type': 'application/json' },
      });
    });

    await loginPage.goto();
    await common.loginHeroHeading().waitFor({ state: 'visible' });

    await loginPage.login(credentials.email, credentials.password);

    await patientsPage.heading.waitFor({ state: 'visible' });
    await expect(page).toHaveURL(/\/patients$/);
    await expect(patientsPage.heading).toBeVisible();
  });

  test('wyświetla komunikat o błędzie przy niepoprawnych danych logowania', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const common = new CommonPage(page);

    const credentials = getTestUserCredentials();

    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        body: JSON.stringify({ message: 'Nieprawidłowy adres e-mail lub hasło.' }),
        headers: { 'content-type': 'application/json' },
      });
    });

    await loginPage.goto();
    await common.loginHeroHeading().waitFor({ state: 'visible' });

    await loginPage.login(credentials.email, credentials.password);

    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.errorMessage('Nie udało się zalogować')).toBeVisible();
    await expect(loginPage.errorMessage('Nieprawidłowy adres e-mail lub hasło.')).toBeVisible();
  });

  test('po kliknięciu Wyloguj przenosi użytkownika na ekran logowania', async ({ page }) => {
    const patientsPage = new PatientsPage(page);
    const common = new CommonPage(page);

    const session = createAuthSession();
    const patientsPayload = createPatientsPage([createPatientListRecord({ firstName: 'Michał', lastName: 'Kowalski' })]);

    await page.addInitScript(([key, value]) => {
      window.localStorage.setItem(key, value);
    }, [AUTH_STORAGE_KEY, JSON.stringify({ state: { session }, version: 0 })]);

    await page.route('**/api/Patients**', async (route) => {
      const authHeader = route.request().headers()['authorization'];
      expect(authHeader).toBe(`Bearer ${session.accessToken}`);

      await route.fulfill({
        status: 200,
        body: JSON.stringify(patientsPayload),
        headers: { 'content-type': 'application/json' },
      });
    });

    await patientsPage.goto();
    await patientsPage.heading.waitFor({ state: 'visible' });

    await expect(common.logoutButton()).toBeVisible();
    await common.logout();

    await expect(page).toHaveURL(/\/login$/);
    await expect(common.loginHeroHeading()).toBeVisible();

    await expect.poll(async () => {
      return page.evaluate((key) => {
        const raw = window.localStorage.getItem(key);
        if (!raw) {
          return null;
        }

        try {
          const parsed = JSON.parse(raw) as { state?: { session?: unknown } };
          return parsed.state?.session ?? null;
        } catch {
          return 'invalid';
        }
      }, AUTH_STORAGE_KEY);
    }).toBeNull();
  });
});
