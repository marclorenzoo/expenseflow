import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para los tests E2E de ExpenseFlow.
 *
 * IMPORTANTE: NO se automatiza el arranque de backend/frontend desde aquí.
 * Los tests asumen que ya están corriendo:
 *   - Backend  → http://localhost:3000  (cd backend && npm run start:dev)
 *   - Frontend → http://localhost:4200  (cd frontend && ng serve)
 *   - BD seedeada (cd backend && npm run db:reset)
 * Ver la sección «Testing» del README en la raíz del repo.
 */
export default defineConfig({
  testDir: './e2e',
  // El usuario E2E se asegura de existir antes de toda la suite.
  globalSetup: './e2e/helpers/global-setup.ts',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  // Los tests comparten el mismo usuario E2E, así que pueden interferir
  // entre sí: los ejecutamos en serie con un único worker.
  fullyParallel: false,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
