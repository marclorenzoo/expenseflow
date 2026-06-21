# ExpenseFlow

_Gestión colaborativa de gastos, sin hojas de cálculo y sin discusiones._

[![Angular](https://img.shields.io/badge/Angular-20-DD0031?logo=angular&logoColor=white)](https://angular.dev)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white)](https://neon.tech)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

**Live Demo**: `https://expenseflow.vercel.app` _(próximamente)_
**API**: `https://expenseflow-api.up.railway.app` _(próximamente)_

<!-- 📸 Coloca aquí la imagen hero del proyecto en: docs/screenshots/hero.png -->
![ExpenseFlow Hero](./docs/screenshots/hero.png)

---

## Índice

- [¿Qué es ExpenseFlow?](#qué-es-expenseflow)
- [Capturas y demo](#capturas-y-demo)
- [Features principales](#features-principales)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Instalación y desarrollo local](#instalación-y-desarrollo-local)
- [Datos de demo](#datos-de-demo)
- [Despliegue](#despliegue)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Testing](#testing)
- [Roadmap](#roadmap)
- [Sobre este proyecto](#sobre-este-proyecto)
- [Licencia](#licencia)

---

## ¿Qué es ExpenseFlow?

Cualquiera que haya compartido un viaje, un piso o las cenas de los viernes con un grupo de amigos conoce el problema: alguien paga la cena, otro pone la gasolina, un tercero adelanta la reserva del hotel… y al cabo de una semana nadie sabe quién debe qué a quién. La hoja de cálculo de turno acaba abandonada y la conversación de "oye, ¿al final cómo lo hacemos?" se repite cada mes.

**ExpenseFlow** resuelve exactamente eso. Creas un grupo, vas registrando quién pagó cada gasto y cómo se reparte entre los miembros, y la app calcula los balances itemizados — quién debe a quién y cuánto — en tiempo real. Saldar cuentas deja de ser un ejercicio de aritmética y de discusiones.

Frente a apuntarlo todo a mano, ExpenseFlow añade lo que de verdad ahorra tiempo: **sincronización en tiempo real** (si un compañero añade un gasto desde su móvil, lo ves al instante sin recargar), **escaneo de tickets con IA** (haces una foto del recibo y rellena el importe, la fecha y la categoría por ti), **cálculo de deudas itemizado por gasto** (no un promedio burdo, sino el reparto real de cada compra) y **soporte multi-divisa** para cuando el viaje cruza fronteras.

---

## Capturas y demo

<!-- 📸 Coloca las capturas en docs/screenshots/ con estos nombres -->

**Dashboard**
![Dashboard](./docs/screenshots/dashboard.png)

**Detalle de un grupo (gastos + balances)**
![Detalle de grupo](./docs/screenshots/group-detail.png)

**Centro de notificaciones**
![Centro de notificaciones](./docs/screenshots/notifications.png)

**Dark mode**
![Dark mode](./docs/screenshots/dark-mode.png)

> 🎥 **Ver demo en vídeo**: `https://youtu.be/XXXXXXXXXXX` _(pendiente de grabar — sustituye esta URL por el enlace de YouTube/Loom)_

---

## Features principales

- 🔐 **Autenticación JWT con refresh tokens** — login con email y contraseña, rotación de refresh tokens y hash seguro de credenciales.
- ⚡ **Sincronización en tiempo real con WebSockets** — los gastos, miembros y notificaciones se propagan al instante a todos los clientes del grupo.
- 🤖 **Escaneo de tickets con IA (Groq Vision)** — sube la foto de un recibo y la app extrae importe, fecha y comercio automáticamente.
- 💰 **Cálculo de deudas itemizado por gasto** — el reparto se calcula gasto a gasto, no con medias aproximadas.
- 🌍 **Multi-divisa (EUR, USD, GBP…)** — registra cada gasto en su moneda original.
- 🔔 **Centro de notificaciones con badge de no leídas** — entérate de cada gasto nuevo, invitación o cambio en tus grupos.
- 📊 **Dashboard con analytics y gráficos** — KPIs y visualizaciones del gasto por categoría y a lo largo del tiempo.
- 🌓 **Dark mode** — tema claro/oscuro completo y persistente.

---

## Stack tecnológico

| Capa | Tecnologías |
|------|-------------|
| **Frontend** | Angular 20 (standalone components + signals), TailwindCSS v4, ApexCharts (`ng-apexcharts`), `socket.io-client` |
| **Backend** | NestJS 11 (API REST modular con prefijo `/api`), Prisma 5, PostgreSQL (Neon), JWT (`@nestjs/jwt` + `passport-jwt`), `socket.io` |
| **Auth** | bcryptjs (12 rounds para el hash), access + refresh tokens con rotación |
| **Realtime** | `socket.io` con rooms por usuario (`user:{id}`) y por grupo (`group:{id}`), JWT validado en el handshake |
| **IA** | Groq Vision API — modelo Llama 4 Scout (`meta-llama/llama-4-scout-17b-16e-instruct`) para OCR de tickets |
| **DevOps** | Vercel (frontend), Railway (backend), Husky + commitlint para los hooks de Git |

---

## Arquitectura

<!-- 📐 Diagrama generado en Excalidraw. Coloca el export en: docs/architecture.png -->
![Arquitectura del sistema](./docs/architecture.png)

El proyecto es un **monorepo** con dos aplicaciones independientes: un SPA de **Angular** y una API de **NestJS**. El frontend consume el backend por dos canales complementarios: una **API REST** (`/api`) para el CRUD habitual (auth, grupos, gastos, perfiles) y una conexión **WebSocket** para todo lo que necesita ser instantáneo.

El backend está organizado en **módulos NestJS** con responsabilidades claras: `auth` (login, registro y refresh de tokens), `users` (perfiles y avatares), `groups` (grupos, miembros y cálculo de balances), `expenses` (gastos, splits y OCR de tickets), `notifications` (centro de notificaciones) y `realtime` (gateway de WebSockets). La persistencia se apoya en **PostgreSQL alojado en Neon**, accedido mediante **Prisma**.

La comunicación en tiempo real usa **`socket.io`** con un esquema de _rooms_: cada cliente se une a su room personal `user:{id}` al conectarse y a un room `group:{id}` por cada grupo que abre. El token **JWT se valida en el handshake** del socket, de modo que solo los clientes autenticados reciben eventos, y estos se emiten únicamente a los rooms relevantes (por ejemplo, un gasto nuevo solo llega a los miembros de ese grupo).

---

## Instalación y desarrollo local

### Prerequisitos

- **Node.js 20+** y **npm**
- Una base de datos **PostgreSQL**: instancia local o un proyecto gratuito en [Neon](https://neon.tech)

### 1. Clonar e instalar

```bash
git clone https://github.com/marclorenzoo/expenseflow.git
cd expenseflow

# Dependencias del backend
cd backend && npm install

# Dependencias del frontend
cd ../frontend && npm install
```

### 2. Configurar variables de entorno

Copia la plantilla y rellena tus valores:

```bash
cd backend
cp .env.example .env
```

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Connection string de PostgreSQL. Con Neon, añade `pgbouncer=true&connection_limit=1`. | `postgresql://user:pass@host/expenseflow?sslmode=require&pgbouncer=true&connection_limit=1` |
| `JWT_SECRET` | Secret usado para firmar y verificar los access y refresh tokens. | `una_cadena_larga_y_aleatoria` |
| `GROQ_API_KEY` | API key de [Groq](https://console.groq.com) para el OCR de tickets con IA. | `gsk_...` |
| `FRONTEND_URL` | Origen permitido por CORS y para los rooms de realtime. | `http://localhost:4200` |

> ℹ️ El `.env.example` incluye además `PORT`, `JWT_EXPIRES_IN` y `JWT_REFRESH_EXPIRES_IN`. Los tiempos de expiración de los tokens están fijados en el servicio de auth (15 min para el access, 7 días para el refresh); el OCR de tickets solo se activa si `GROQ_API_KEY` está presente.

### 3. Preparar la base de datos

```bash
cd backend
npx prisma generate
npx prisma db push
```

### 4. Arrancar los dos servidores

```bash
# Terminal 1 — backend (API en http://localhost:3000/api)
cd backend && npm run start:dev

# Terminal 2 — frontend (http://localhost:4200)
cd frontend && npm start
```

- **Frontend**: [http://localhost:4200](http://localhost:4200)
- **Backend**: [http://localhost:3000/api](http://localhost:3000/api)

---

## Datos de demo

Para poblar la base de datos con datos de ejemplo en un solo paso (recrea el esquema, regenera el cliente Prisma y siembra los datos):

```bash
cd backend
npm run db:reset
```

`db:reset` ejecuta `prisma db push --force-reset && prisma generate && npm run seed`. Si las tablas ya existen y solo quieres re-sembrar, basta con `npm run seed`.

El seed crea **5 usuarios**, **3 grupos** (_Viaje a Barcelona 2026_, _Cena de los viernes_, _Piso compartido_) y **25 gastos** repartidos en **7 categorías**, con importes en **varias divisas**.

### Usuarios de demo

Todos comparten la misma contraseña: **`Demo1234!`**

| Email | Rol |
|-------|-----|
| `marc@demo.com` | Admin de los 3 grupos |
| `laura@demo.com` | Miembro |
| `raul@demo.com` | Miembro |
| `ana@demo.com` | Miembro |
| `shanks@demo.com` | Miembro |

> ⚠️ **Aviso**: el seed **borra todos los datos existentes** antes de poblar. No lo ejecutes contra una base de datos de producción.

> 🔧 **Nota técnica (Neon + PgBouncer)**: Neon usa pooling con PgBouncer. Si tras reseedear ves errores 500 con el mensaje `cached plan must not change result type`, el pool mantiene planes cacheados del esquema anterior y reiniciar el backend no basta. Ve a [console.neon.tech](https://console.neon.tech), pulsa **Suspend** en el compute endpoint y luego **Resume** para cerrar todas las conexiones del pool. Es un comportamiento conocido del pooler.

---

## Despliegue

El despliegue está planificado sobre **Vercel** (frontend) y **Railway** (backend), ambos conectados a la misma base de datos PostgreSQL en **Neon**.

- **Frontend (Vercel)**: Vercel autodetecta el proyecto Angular. Solo hay que apuntar `apiUrl` y `socketUrl` a la URL pública de Railway en `frontend/src/environments/environment.production.ts`.
- **Backend (Railway)**: se despliega con `DATABASE_URL` apuntando a Neon y las **mismas variables de entorno** que en local (`JWT_SECRET`, `GROQ_API_KEY`, `FRONTEND_URL`, `PORT`).

> 🚧 **Estado actual**: próximamente. Las URLs públicas (`expenseflow.vercel.app` y `expenseflow-api.up.railway.app`) están reservadas pero todavía no activas.

---

## Estructura del proyecto

```text
expenseflow/
├── backend/                      # API REST + WebSockets (NestJS 11)
│   ├── prisma/
│   │   ├── schema.prisma         # Modelo de datos (Prisma)
│   │   ├── migrations/           # Historial de migraciones
│   │   └── seed.ts               # Script de datos de demo
│   └── src/
│       ├── common/               # Decorators, guards, filters e interceptors compartidos
│       ├── prisma/               # PrismaService / PrismaModule
│       ├── modules/
│       │   ├── auth/             # Login, registro, refresh de tokens (+ dto/)
│       │   ├── users/            # Perfiles de usuario y avatares
│       │   ├── groups/           # Grupos, miembros y balances (settlements.utils.ts)
│       │   ├── expenses/         # Gastos, splits y OCR de tickets (receipt-ocr.service.ts)
│       │   ├── notifications/    # Centro de notificaciones
│       │   └── realtime/         # Gateway de WebSockets (rooms user/group)
│       └── main.ts               # Bootstrap: prefijo /api, validación, CORS, uploads
│
└── frontend/                     # SPA (Angular 20)
    └── src/
        ├── environments/         # environment.ts / environment.production.ts
        └── app/
            ├── core/             # services, stores (signals), guards, interceptors
            ├── features/         # áreas por ruta: auth, dashboard, groups,
            │                     #   expenses, analytics, profile, landing
            ├── shared/           # modelos, pipes y directivas transversales
            └── ui/               # design system: components/ y layouts/
```

---

## Testing

El backend incluye la configuración de **Jest** (unit y e2e: `npm test` y `npm run test:e2e`) y el frontend usa **Jest** para tests unitarios (`npm test`).

> 🔄 Los **tests E2E con Playwright** están en desarrollo (Día 35 del roadmap). Aún no hay suite de Playwright en el repo.

---

## Roadmap

- ✅ Autenticación JWT + refresh tokens
- ✅ CRUD de grupos y miembros
- ✅ CRUD de gastos con splits
- ✅ Cálculo de balances itemizado
- ✅ Multi-divisa
- ✅ Dashboard con analytics
- ✅ Escaneo de tickets con IA
- ✅ Sincronización en tiempo real con WebSockets
- ✅ Centro de notificaciones
- 🔄 Tests E2E con Playwright
- 🔄 Despliegue en producción (Vercel + Railway)
- 📋 Activity Feed por grupo
- 📋 Marcar deudas como saldadas

---

## Sobre este proyecto

ExpenseFlow es un proyecto de portfolio construido por **Marc Lorenzo**, desarrollador full-stack con foco en Angular. Lo construí en aproximadamente **38 días** como demostración de capacidades modernas de desarrollo full-stack: arquitectura escalable, signals de Angular, NestJS modular, sincronización en tiempo real, integración de IA y deploy real en producción.

Si estás buscando contratar a un developer con experiencia en Angular moderno + backend con Node y quieres ver cómo trabajo, este repositorio es una buena muestra. Puedes contactarme en:

- 📧 **Email**: lorenzooltramarc@gmail.com
- 🐙 **GitHub**: [@marclorenzoo](https://github.com/marclorenzoo)

---

## Licencia

Distribuido bajo licencia MIT. Ver [`LICENSE`](./LICENSE) para más información.
