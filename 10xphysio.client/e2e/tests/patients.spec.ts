import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { CommonPage } from '../pom/Common';
import { PatientsPage } from '../pom/PatientsPage';
import type { AuthSessionDto } from '../utils/test-data';
import { createAuthSession, createPatientListRecord, createPatientsPage } from '../utils/test-data';

const AUTH_STORAGE_KEY = '10xphysio.auth.session';

const seedAuthSession = async (page: Page, session: AuthSessionDto) => {
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      window.localStorage.setItem(key, value);
    },
    {
      key: AUTH_STORAGE_KEY,
      value: JSON.stringify({ state: { session }, version: 0 }),
    },
  );
};

test.describe('Lista pacjentów', () => {
  test('wyświetla załadowanych pacjentów oraz umożliwia odświeżenie listy', async ({ page }) => {
    const patientsPage = new PatientsPage(page);
    const common = new CommonPage(page);

    const session = createAuthSession();
    const patientAnna = createPatientListRecord({ id: 'patient-1', firstName: 'Anna', lastName: 'Nowak' });
    const patientPiotr = createPatientListRecord({ id: 'patient-2', firstName: 'Piotr', lastName: 'Zieliński', latestVisitDate: null, visitCount: 0 });
    const firstPayload = createPatientsPage([patientAnna, patientPiotr]);
    const refreshedPayload = createPatientsPage([
      { ...patientAnna, visitCount: 6 },
      { ...patientPiotr, visitCount: 1, latestVisitDate: '2025-02-10T12:00:00Z' },
    ]);

    await seedAuthSession(page, session);

    let requestCount = 0;

    await page.route('**/api/Patients**', async (route) => {
      requestCount += 1;
      const payload = requestCount === 1 ? firstPayload : refreshedPayload;

      await route.fulfill({
        status: 200,
        body: JSON.stringify(payload),
        headers: { 'content-type': 'application/json' },
      });
    });

    await patientsPage.goto();
    await patientsPage.heading.waitFor({ state: 'visible' });

  await expect(common.logoutButton()).toBeVisible();
  await expect(patientsPage.table).toBeVisible();

  const rows = patientsPage.rows();
  await expect(rows).toHaveCount(2, { timeout: 10_000 });
  const annaRow = patientsPage.patientRow('Anna Nowak');
  const piotrRow = patientsPage.patientRow('Piotr Zieliński');

  await expect(annaRow).toHaveCount(1);
  await expect(annaRow.first()).toContainText('5');
  await expect(piotrRow).toHaveCount(1);
  await expect(piotrRow.first()).toContainText('0');

    await expect.poll(() => requestCount).toBe(1);

    await patientsPage.search('Piotr');

    await expect.poll(() => requestCount).toBe(2);
  await expect(rows).toHaveCount(2, { timeout: 10_000 });
    await expect(piotrRow.first()).toContainText('1');
    await expect(piotrRow.first()).toContainText('10.02.2025');
    await expect(annaRow.first()).toContainText('6');
  });
});
