import { request } from '@playwright/test';
import { API_URL, E2E_USER } from './setup';

/**
 * Global setup: garantiza que el usuario E2E existe ANTES de que corra la
 * suite, evitando que el primer test falle por «el usuario no existe».
 *
 * Hace un POST directo a /api/auth/register. Si el usuario ya existe el backend
 * responde con un 4xx (típicamente 409 Conflict): lo ignoramos a propósito.
 */
async function globalSetup(): Promise<void> {
  const context = await request.newContext();
  try {
    const res = await context.post(`${API_URL}/auth/register`, {
      data: {
        name: E2E_USER.name,
        email: E2E_USER.email,
        password: E2E_USER.password,
      },
      // No lanzamos por códigos de error; los gestionamos abajo.
      failOnStatusCode: false,
    });

    if (res.ok()) {
      console.log(`[global-setup] Usuario E2E creado: ${E2E_USER.email}`);
    } else {
      // 409 / 400 → el usuario ya existía. Es el caso esperado en re-runs.
      console.log(
        `[global-setup] Usuario E2E ya existente (status ${res.status()}). Continuando.`,
      );
    }
  } catch (error) {
    // Si el backend no está corriendo, avisamos con claridad.
    console.warn(
      `[global-setup] No se pudo contactar con el backend en ${API_URL}. ` +
        `Asegúrate de que está corriendo (cd backend && npm run start:dev).`,
    );
    throw error;
  } finally {
    await context.dispose();
  }
}

export default globalSetup;
