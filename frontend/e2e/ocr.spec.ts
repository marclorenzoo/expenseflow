import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { E2E_USER, loginUser } from './helpers/setup';

/** Crea un grupo nuevo y deja la página en su detalle (/groups/:id). */
async function createGroup(page: Page): Promise<void> {
  await page.goto('/groups');
  await page.getByTestId('create-group-button').click();
  await page.getByTestId('group-name-input').fill(`Grupo OCR ${Date.now()}`);
  await page.getByTestId('group-submit').click();
  await page.waitForURL(/\/groups\/[^/]+$/);
}

test.describe('OCR de tickets (mockeado)', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, E2E_USER.email, E2E_USER.password);
  });

  test('should auto-fill expense form from OCR mock', async ({ page }) => {
    await createGroup(page);

    // Interceptamos el endpoint de OCR con una respuesta determinista.
    // Es el ÚNICO endpoint mockeado: el resto va contra el backend real.
    await page.route('**/api/expenses/parse-receipt', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total: 14.11,
          date: '2026-05-15',
          merchant: 'MERCADONA S.A.',
          items: [],
        }),
      });
    });

    // Abrir el formulario de gasto.
    await page.getByTestId('add-expense-button').click();

    // Subir un ticket dummy al input de archivo (oculto). El contenido del
    // archivo da igual: la respuesta OCR está mockeada.
    const fixture = path.join(__dirname, 'fixtures', 'sample-receipt.jpg');
    await page.getByTestId('receipt-input').setInputFiles(fixture);

    // El formulario se rellena con los datos del mock.
    await expect(page.getByTestId('expense-amount')).toHaveValue('14.11');
    await expect(page.getByTestId('expense-description')).toHaveValue(
      'MERCADONA S.A.',
    );

    // OJO: «expense-date» NO es un <input type="date"> nativo, sino un
    // ef-datepicker (botón + calendario). Muestra la fecha localizada en
    // español ("15 de mayo de 2026"), no el ISO "2026-05-15". Verificamos el
    // texto mostrado: día, mes y año.
    const dateTrigger = page.getByTestId('expense-date');
    await expect(dateTrigger).toContainText('15');
    await expect(dateTrigger).toContainText('mayo');
    await expect(dateTrigger).toContainText('2026');
  });
});
