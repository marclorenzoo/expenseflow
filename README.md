# ExpenseFlow

ExpenseFlow is a collaborative expense-management app for shared spending. Create a group, log who paid for what, split each expense across members, and ExpenseFlow figures out the itemized balances — who owes whom and how much — so settling up is no longer a spreadsheet exercise. Built for trips, flatmates, and any group that shares costs.

## Tech Stack

### Frontend
- **Angular 20** — standalone components, signals-based state
- **TailwindCSS v4** — utility styling with built-in dark mode
- **ApexCharts** (`ng-apexcharts`) — analytics charts
- **RxJS** — async streams
- **TypeScript**

### Backend
- **NestJS 11** — modular REST API (global `/api` prefix)
- **Prisma 5** ORM
- **PostgreSQL** (hosted on **Neon**, `@neondatabase/serverless`)
- **JWT auth** (`@nestjs/jwt` + `passport-jwt`) with access + refresh tokens
- **bcryptjs** — password hashing
- **Multer + Sharp** — image upload and processing
- **class-validator / class-transformer** — DTO validation
- **TypeScript**

## Features

- **Authentication** — email/password sign-up and login with JWT access tokens and refresh-token rotation.
- **Groups** — create groups, manage members with roles (admin/member), and invite people into a group.
- **Expenses** — record expenses with categories (food, transport, accommodation, entertainment, shopping, health, other), multi-currency support, and configurable splits across members.
- **Itemized balances** — per-group breakdown of who owes whom, derived from expenses and their splits.
- **Analytics** — KPIs and charts summarizing group spending.
- **Dark mode** — full light/dark theming.
- **Image uploads** — avatars for users and groups, processed server-side.

## Screenshots

> Replace the placeholders below with real screenshots.

![Dashboard](docs/screenshot-dashboard.png)
![Group detail & balances](docs/screenshot-group-detail.png)
![Expenses](docs/screenshot-expenses.png)
![Analytics](docs/screenshot-analytics.png)
![Dark mode](docs/screenshot-dark-mode.png)

## Getting Started

### Prerequisites
- Node.js (LTS recommended)
- A PostgreSQL database (e.g. a free [Neon](https://neon.tech) project)

### 1. Backend

```bash
cd backend
npm install
```

Create a `.env` file (use `backend/.env.example` as a template):

```env
DATABASE_URL="postgresql://user:password@host/expenseflow?sslmode=require"
JWT_SECRET="your_secret_key"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
```

Apply the Prisma schema to your database and generate the client:

```bash
npx prisma generate
npx prisma db push   # or: npx prisma migrate dev
```

Start the API:

```bash
npm run start:dev    # watch mode at http://localhost:3000/api
```

> The backend serves uploaded images from an `uploads/` directory at `/uploads`, and CORS is configured for `http://localhost:4200`.

### 2. Frontend

```bash
cd frontend
npm install
npm start            # ng serve at http://localhost:4200
```

> **Note:** the frontend currently points at `http://localhost:3000/api` (hardcoded in the `core/services`). If your backend runs elsewhere, update the `API` base in those services.
>
> TODO: extract the API base URL into Angular environment files.

## Demo data

Para poblar la BD con datos de demo (3 grupos, 5 usuarios, ~25 gastos), usa
el comando recomendado, que recrea el esquema, regenera el cliente y siembra
los datos en un solo paso:

```bash
cd backend
npm run db:reset
```

`db:reset` ejecuta `prisma db push --force-reset && prisma generate && npm run seed`.

Si las tablas ya existen y solo quieres re-sembrar (el seed **borra todos los
datos existentes** antes de poblar), basta con:

```bash
cd backend
npm run seed
```

> Este proyecto usa `prisma db push` (no `prisma migrate`), por lo que
> `npx prisma migrate reset` no recreará el esquema. Usa `npm run db:reset`.

#### Conexión a Neon (PgBouncer)

Neon usa pooling con **PgBouncer**. Para que Prisma funcione bien con el pooler
y evitar errores de _prepared statements_ tras recrear la BD, la `DATABASE_URL`
del `.env` debe incluir `pgbouncer=true` (y `connection_limit=1` en desarrollo):

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require&pgbouncer=true&connection_limit=1"
```

> **Troubleshooting:** Si después de re-sembrar (`db:reset` / `db push --force-reset`)
> el backend devuelve errores 500 con `cached plan must not change result type`,
> el pool de Neon mantiene planes cacheados del esquema anterior. Reiniciar el
> backend NO basta. Ve al [dashboard de Neon](https://console.neon.tech), pulsa
> **Suspend** en el compute endpoint y luego **Resume** — eso cierra todas las
> conexiones del pool. Es un comportamiento conocido del pooler.

### Usuarios demo

Todos los usuarios usan la misma contraseña: `Demo1234!`

| Email              | Notas              |
|--------------------|--------------------|
| marc@demo.com      | Usuario principal  |
| laura@demo.com     |                    |
| raul@demo.com      |                    |
| ana@demo.com       |                    |
| shanks@demo.com    |                    |

> ⚠️ El seed BORRA todos los datos existentes antes de poblar.
> No lo ejecutes en producción.

## Architecture

The repo is a monorepo with two independent apps:

```
expenseflow/
├── frontend/   # Angular 20 SPA
└── backend/    # NestJS REST API
```

### Frontend (`frontend/src/app`)

```
app/
├── core/
│   ├── services/      # API clients & app services (auth, groups, expenses, users, theme, toast)
│   ├── stores/        # signal-based state stores (groups, expenses, balances)
│   ├── guards/        # route guards (auth)
│   └── interceptors/  # HTTP interceptors (auth token)
├── features/          # feature areas, each with its own routes + pages
│   ├── auth/
│   ├── dashboard/
│   ├── groups/
│   ├── expenses/
│   ├── analytics/
│   └── profile/
├── shared/            # cross-cutting models, pipes, directives
└── ui/                # reusable presentational layer
    ├── components/    # button, card, chart, input, datepicker, toast,
    │                  # skeleton, empty-state, error-state
    └── layouts/       # app layouts
```

- **`core/services`** wrap HTTP calls and app-wide concerns.
- **`core/stores`** hold reactive state with Angular signals, keeping components thin.
- **`features/*`** are route-driven areas, each exposing a `*.routes.ts` and a `pages/` folder.
- **`ui/*`** holds the reusable design-system components shared across features.

### Backend (`backend/src`)

```
src/
├── modules/
│   ├── auth/       # JWT login/refresh, DTOs
│   ├── users/      # user profiles & avatars
│   ├── groups/     # groups, members, balances
│   └── expenses/   # expenses, splits, settlement utils
├── common/
│   ├── decorators/
│   ├── guards/
│   ├── filters/
│   └── interceptors/
├── prisma/         # Prisma service / module
└── main.ts         # bootstrap (global /api prefix, validation, CORS, static uploads)
```

- Each **module** bundles a controller + service (e.g. `groups.controller.ts`, `groups.service.ts`).
- Balance calculation lives alongside the expenses module (`settlements.utils.ts`).
- **`common/`** holds shared decorators, guards, filters, and interceptors.
- The Prisma schema is defined in `backend/prisma/schema.prisma`.

## Testing

```bash
# backend
cd backend && npm test

# frontend
cd frontend && npm test
```

## License

TODO: no license specified yet.

## Deployment

TODO: no public deployment URL yet.
