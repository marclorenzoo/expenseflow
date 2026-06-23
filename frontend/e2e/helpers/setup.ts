import { Page, expect } from '@playwright/test';

/** Usuario E2E dedicado. No es ninguno del seed (marc@demo.com, etc.). */
export const E2E_USER = {
  email: 'e2e@test.com',
  password: 'E2eTest1234!',
  name: 'E2E Test',
} as const;

/** Base URL del backend (NestJS). Los tests asumen que está corriendo. */
export const API_URL = 'http://localhost:3000/api';

/**
 * Rellena el formulario de registro y lo envía.
 *
 * Si el usuario ya existe, el backend devuelve un error y la app se queda en
 * /auth/register mostrando un mensaje. En ese caso navegamos a /login para
 * que el flujo del test pueda continuar (el caso «ya existe» no es un fallo).
 */
export async function registerUser(
  page: Page,
  email: string,
  password: string,
  name: string,
): Promise<void> {
  await page.goto('/auth/register');
  await page.getByTestId('register-name').fill(name);
  await page.getByTestId('register-email').fill(email);
  await page.getByTestId('register-password').fill(password);
  await page.getByTestId('register-submit').click();

  // Esperamos a uno de dos desenlaces: dashboard (registro OK) o seguir en
  // register con un error (usuario ya existente).
  try {
    await page.waitForURL('**/dashboard', { timeout: 8000 });
  } catch {
    // El registro no redirigió (probablemente el usuario ya existe).
    // Redirigimos manualmente a login para no dejar el test colgado.
    await page.goto('/auth/login');
  }
}

/**
 * Rellena el formulario de login y lo envía. Espera a que cargue el dashboard.
 */
export async function loginUser(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/auth/login');
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await page.waitForURL('**/dashboard', { timeout: 10_000 });
  // El token se guarda en localStorage tras un login correcto.
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('access_token')))
    .not.toBeNull();
}

/** Cierra sesión pulsando el botón «Salir» de la topbar. */
export async function logout(page: Page): Promise<void> {
  await page.getByTestId('logout-button').click();
  await page.waitForURL('**/auth/login');
}
