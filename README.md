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
