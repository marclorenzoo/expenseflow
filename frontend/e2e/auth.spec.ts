import { test, expect } from '@playwright/test';
import { E2E_USER, loginUser, logout } from './helpers/setup';

test.describe('Autenticación', () => {
  test('should register a new user with timestamp', async ({ page }) => {
    // Email único por ejecución para no chocar con registros previos.
    const email = `e2e-${Date.now()}@test.com`;

    await page.goto('/auth/register');
    await page.getByTestId('register-name').fill('E2E Nuevo');
    await page.getByTestId('register-email').fill(email);
    await page.getByTestId('register-password').fill(E2E_USER.password);
    await page.getByTestId('register-submit').click();

    // Un registro correcto redirige al dashboard.
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should login with the E2E user', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByTestId('login-email').fill(E2E_USER.email);
    await page.getByTestId('login-password').fill(E2E_USER.password);
    await page.getByTestId('login-submit').click();

    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);

    // El token JWT debe quedar persistido en localStorage.
    const token = await page.evaluate(() =>
      localStorage.getItem('access_token'),
    );
    expect(token).toBeTruthy();
  });

  test('should logout the user', async ({ page }) => {
    await loginUser(page, E2E_USER.email, E2E_USER.password);

    await logout(page);

    await expect(page).toHaveURL(/\/auth\/login/);
    const token = await page.evaluate(() =>
      localStorage.getItem('access_token'),
    );
    expect(token).toBeNull();
  });

  test('should reject login with wrong password', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByTestId('login-email').fill(E2E_USER.email);
    await page.getByTestId('login-password').fill('contraseña-incorrecta');
    await page.getByTestId('login-submit').click();

    // No debe redirigir: seguimos en login.
    await expect(page).toHaveURL(/\/auth\/login/);
    // Y debe mostrarse un mensaje de error.
    await expect(page.locator('.form-error')).toBeVisible();
    const token = await page.evaluate(() =>
      localStorage.getItem('access_token'),
    );
    expect(token).toBeNull();
  });
});
