# ExpenseFlow — Contexto del proyecto

## Stack

- Frontend: Angular 20, TailwindCSS v4, Signals, standalone components
- Backend: NestJS, Prisma 5, PostgreSQL (Neon)
- Deploy: Vercel (frontend), Railway (backend)

## Días completados: 1-13

## Día actual: 14 — Optimistic UI

## Arquitectura frontend

- Feature-based: features/auth, features/groups, features/dashboard
- core/services: auth.service, groups.service, expenses.service
- core/guards: auth.guard
- core/interceptors: auth.interceptor (JWT + refresh automático)
- ui/components: button, input, card, datepicker

## Decisiones importantes

- Prisma 5 (no 7) por compatibilidad con Neon
- TailwindCSS v4 con PostCSS (.css no .scss)
- Zoneless: NO (zone.js activo)
- Tablas creadas manualmente en Neon SQL
- Splits de gastos en tabla expense_splits
- Fotos guardadas en backend/uploads/ servidas como static assets

## Rol del mentor

- Backend → Claude Code
- Frontend lógica (services, signals, guards) → tú + mentor juntos
- Diseño UI → Claude Code
