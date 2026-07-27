# 🛰️ Atlas Supervisor Web

> Panel de supervisión para operaciones de campo de ISP. Transforma tickets del sistema administrativo en **Órdenes de Trabajo (OT)** y coordina cuadrillas, clientes y SLA desde un solo lugar.

<p align="left">
  <img alt="NestJS" src="https://img.shields.io/badge/Backend-NestJS-e0234e?style=flat-square&logo=nestjs&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/Frontend-React_19-61dafb?style=flat-square&logo=react&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/DB-PostgreSQL_+_PostGIS-336791?style=flat-square&logo=postgresql&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/Lang-TypeScript-3178c6?style=flat-square&logo=typescript&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/Uso-Privado-lightgrey?style=flat-square">
</p>

---

## 📖 Índice

- [¿Qué es Atlas?](#-qué-es-atlas)
- [Stack tecnológico](#️-stack-tecnológico)
- [Estructura del monorepo](#-estructura-del-monorepo)
- [Puesta en marcha](#-puesta-en-marcha)
- [Variables de entorno](#-variables-de-entorno)
- [Scripts disponibles](#-scripts-disponibles)
- [Usuario de prueba](#-usuario-de-prueba)
- [Estado del proyecto](#-estado-del-proyecto)

---

## 🧭 ¿Qué es Atlas?

Atlas **no es un sistema de tickets**. El ISP ya tiene su propio sistema administrativo con clientes, facturación y tickets. Atlas se integra con ese sistema y convierte cada ticket en una **Orden de Trabajo (OT)** — la entidad central de la plataforma.

- 🖥️ **El Supervisor** trabaja desde este Panel Web: asigna cuadrillas, monitorea SLA y sigue el estado de cada OT en tiempo real.
- 📱 **El Técnico** trabaja desde una app móvil aparte, donde ejecuta la OT y carga evidencia (fotos, firma, checklist).
- 🔌 Atlas nunca reemplaza al sistema existente del ISP: siempre se integra con él.

## 🛠️ Stack tecnológico

| | Frontend (`panel-web`) | Backend (`api`) |
|---|---|---|
| Lenguaje | TypeScript | TypeScript |
| Framework | React 19 + Vite | NestJS |
| Estilos | TailwindCSS (dark/light mode) | — |
| Ruteo | React Router | — |
| Formularios | React Hook Form | class-validator (DTOs) |
| Base de datos | — | PostgreSQL + PostGIS vía Prisma |
| Auth | JWT (access + refresh) | JWT + Passport |
| Tiempo real | Socket.IO client | Socket.IO / WebSockets |
| Docs API | — | Swagger |
| Infraestructura | — | Docker Compose (Postgres + Redis) |

## 📂 Estructura del monorepo

```
atlas-supervisor-web/
├── docker-compose.yml        # Postgres (PostGIS) + Redis
├── ARCHITECTURE.md           # Decisiones de arquitectura en detalle
└── packages/
    ├── api/                  # Backend NestJS
    │   ├── prisma/           # schema.prisma + seed
    │   └── src/
    │       ├── modules/      # auth, users, orders, crews, customers,
    │       │                 # dashboard, reports, settings, notifications
    │       ├── common/       # guards, interceptors, filters, decorators
    │       └── websockets/   # eventos en tiempo real
    │
    └── panel-web/            # Frontend React
        └── src/
            ├── modules/      # auth, dashboard, orders, crews, customers...
            └── shared/       # components, layouts, contexts, services
```

Cada módulo del frontend sigue una estructura **feature-first** (`pages/`, `components/`, `hooks/`, `services/`), pensada para escalar sin volverse un monolito de componentes.

## 🚀 Puesta en marcha

### Requisitos

- Node.js 20+
- Docker Desktop (para Postgres/PostGIS y Redis)

### 1. Levantar la infraestructura

```bash
docker compose up -d
```

Esto levanta Postgres (con PostGIS) en el puerto `5433` y Redis en el `6379`.

> 💡 Si ya tenés un PostgreSQL nativo escuchando en el `5432`, el `docker-compose.yml` usa `5433` justamente para evitar ese choque de puertos.

### 2. Backend (`packages/api`)

```bash
cd packages/api
npm install
cp .env.example .env      # completá las variables (ver sección siguiente)
npx prisma migrate dev    # crea las tablas
npx prisma db seed        # crea el usuario admin de prueba
npm run start:dev
```

La API queda en `http://localhost:3000`, con Swagger en `http://localhost:3000/api/docs`.

### 3. Frontend (`packages/panel-web`)

```bash
cd packages/panel-web
npm install
npm run dev
```

El panel queda en `http://localhost:5173` y ya tiene configurado el proxy hacia la API (`/api` → `http://localhost:3000`).

## 🔐 Variables de entorno

`packages/api/.env`:

```bash
DATABASE_URL="postgresql://atlas:atlas123@localhost:5433/atlas_db?schema=public"

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=cambiar-este-secreto
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

PORT=3000
NODE_ENV=development

CORS_ORIGIN=http://localhost:5173

SWAGGER_TITLE=Atlas Supervisor API
SWAGGER_DESCRIPTION=API para la gestión de operaciones de campo
SWAGGER_VERSION=1.0
SWAGGER_PATH=api/docs
```

## 📜 Scripts disponibles

**`packages/api`**

| Script | Descripción |
|---|---|
| `npm run start:dev` | Levanta la API en modo watch |
| `npm run build` | Compila a `dist/` |
| `npx prisma migrate dev` | Aplica migraciones de base de datos |
| `npx prisma db seed` | Siembra datos iniciales |
| `npx prisma studio` | UI para explorar la base de datos |

**`packages/panel-web`**

| Script | Descripción |
|---|---|
| `npm run dev` | Levanta el panel en modo desarrollo |
| `npm run build` | Type-check (`tsc -b`) + build de producción |
| `npm run preview` | Sirve el build de producción localmente |

## 👤 Usuario de prueba

Después de correr el seed, podés ingresar al panel con:

| Email | Contraseña |
|---|---|
| `admin@atlas.local` | `admin123` |

## 🚧 Estado del proyecto

- ✅ Login + autenticación JWT (access + refresh token)
- ✅ Layout principal (sidebar, topbar, navegación) con modo día/noche
- ✅ Dashboard con KPIs, alertas de SLA y estados vacíos
- 🔜 Listado y detalle de Órdenes de Trabajo
- 🔜 Cuadrillas, clientes y reportes
- 🔜 Mapa interactivo de cuadrillas en tiempo real

Para el detalle completo de decisiones de arquitectura, modelo de datos y flujo entre sistemas, ver [`ARCHITECTURE.md`](./ARCHITECTURE.md).
