import { test, expect, Page } from '@playwright/test';
import { E2E_USER, loginUser } from './helpers/setup';

/**
 * Crea un grupo nuevo desde /groups y devuelve su nombre y su id.
 * Tras crear, la app redirige a /groups/:id (página de detalle).
 */
async function createGroup(page: Page): Promise<{ name: string; id: string }> {
  const name = `Grupo E2E ${Date.now()}`;

  await page.goto('/groups');
  await page.getByTestId('create-group-button').click();
  await page.getByTestId('group-name-input').fill(name);
  await page.getByTestId('group-submit').click();

  // submitCreate navega al detalle del grupo: /groups/<id>
  await page.waitForURL(/\/groups\/[^/]+$/);
  const id = page.url().split('/groups/')[1];

  return { name, id };
}

test.describe('Grupos, gastos y balances', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, E2E_USER.email, E2E_USER.password);
  });

  test('should create a new group', async ({ page }) => {
    const { name } = await createGroup(page);

    // En el detalle, el nombre del grupo debe verse.
    await expect(page.locator('h1', { hasText: name })).toBeVisible();

    // Y al volver a la lista, debe aparecer también ahí.
    await page.goto('/groups');
    await expect(page.locator('.group-card', { hasText: name })).toBeVisible();
  });

  test('should create an expense and verify it appears', async ({ page }) => {
    await createGroup(page);

    // Abrir el formulario de gasto.
    await page.getByTestId('add-expense-button').click();

    // Rellenar el formulario.
    await page.getByTestId('expense-description').fill('Test Expense');
    await page.getByTestId('expense-amount').fill('100');
    await page.getByTestId('expense-category').selectOption('food');

    await page.getByTestId('expense-submit').click();

    // El gasto aparece en la lista.
    await expect(
      page.locator('.exp-row', { hasText: 'Test Expense' }),
    ).toBeVisible();

    // El panel de balances existe en el DOM.
    const balances = page.getByTestId('balances-panel');
    await expect(balances).toBeVisible();

    // El total del grupo refleja el gasto (100,00 €). Con un único miembro no
    // hay deudas entre personas, así que comprobamos el total del grupo.
    await expect(balances).toContainText('100');
  });

  test('should invite another user to the group', async ({ page }) => {
    await createGroup(page);

    // Laura existe en el seed (laura@demo.com).
    await page.getByTestId('invite-email-input').fill('laura@demo.com');
    await page.getByTestId('invite-submit').click();

    // Tras invitar, Laura aparece en la lista de miembros.
    await expect(
      page.getByTestId('member-item').filter({ hasText: 'laura@demo.com' }),
    ).toBeVisible();
    // El grupo pasa a tener al menos 2 miembros (E2E + Laura).
    await expect(page.getByTestId('member-item')).toHaveCount(2);
  });
});
