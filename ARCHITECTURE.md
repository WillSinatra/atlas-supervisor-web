# ATLAS SUPERVISOR WEB - ARQUITECTURA

## Visión General

Atlas Supervisor Web es un SaaS para la gestión de operaciones de campo de ISP. 
Consume tickets del sistema administrativo del ISP y los transforma en Órdenes de Trabajo (OT) 
que son gestionadas por supervisores desde este panel y ejecutadas por técnicos desde la App móvil.

## Stack Tecnológico

### Frontend (panel-web)
- React 19 + TypeScript (strict mode)
- Vite (build tool)
- TailwindCSS + Dark Mode
- React Router v7 (navegación)
- TanStack Query v5 (data fetching + cache)
- TanStack Table v8 (tablas profesionales)
- React Hook Form + Zod (formularios + validación)
- Framer Motion (animaciones)
- Leaflet + React-Leaflet (mapas)
- Recharts (gráficos)
- Shadcn UI + Radix UI (componentes base)
- Lucide Icons (iconografía)
- Zod (schemas de validación)

### Backend (api)
- NestJS + TypeScript
- Prisma ORM + PostgreSQL + PostGIS
- Redis (cache + sesiones + colas)
- BullMQ (cola de tareas)
- JWT (autenticación)
- Swagger (documentación API)
- Docker + Docker Compose

## Estructura del Monorepo

```
atlas-supervisor-web/
├── packages/
│   ├── api/                    # Backend NestJS
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── common/
│   │   │   │   ├── decorators/
│   │   │   │   ├── guards/
│   │   │   │   ├── interceptors/
│   │   │   │   ├── filters/
│   │   │   │   ├── pipes/
│   │   │   │   └── dto/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── orders/
│   │   │   │   ├── crews/
│   │   │   │   ├── customers/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── reports/
│   │   │   │   ├── settings/
│   │   │   │   └── notifications/
│   │   │   ├── websockets/
│   │   │   └── integrations/
│   │   ├── test/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── panel-web/             # Frontend React
│       ├── public/
│       ├── src/
│       │   ├── app/
│       │   │   ├── router/
│       │   │   └── providers/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── dashboard/
│       │   │   ├── orders/
│       │   │   ├── crews/
│       │   │   ├── customers/
│       │   │   ├── reports/
│       │   │   └── settings/
│       │   ├── shared/
│       │   │   ├── components/
│       │   │   ├── hooks/
│       │   │   ├── services/
│       │   │   ├── layouts/
│       │   │   ├── contexts/
│       │   │   └── utils/
│       │   ├── types/
│       │   └── styles/
│       ├── index.html
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       └── package.json
│
├── docker-compose.yml
├── docker-compose.dev.yml
├── .gitignore
└── README.md
```

## Responsabilidad de Carpetas

### packages/api/src/common/
- **decorators/**: Decoradores personalizados (CurrentUser, Roles, Public)
- **guards/**: Guards de autenticación y autorización (JwtAuthGuard, RolesGuard)
- **interceptors/**: Interceptores globales (TransformInterceptor, LoggingInterceptor)
- **filters/**: Filtros de excepciones (HttpExceptionFilter, PrismaExceptionFilter)
- **pipes/**: Pipes de validación (ValidationPipe personalizado)
- **dto/**: DTOs base y páginación

### packages/api/src/modules/
- **auth/**: Autenticación JWT, refresh tokens, recuperación de contraseña
- **users/**: CRUD de usuarios, roles, permisos
- **orders/**: Órdenes de trabajo, estados, asignación, timeline
- **crews/**: Cuadrillas, técnicos, vehículos, stock, geolocalización
- **customers/**: Clientes, domicilios, equipos, histórico
- **dashboard/**: Datos agregados para el dashboard ejecutivo
- **reports/**: Reportes analíticos, KPIs, exportaciones
- **settings/**: Configuración del sistema, catálogos, integraciones
- **notifications/**: Notificaciones push, email, WebSocket

### packages/api/src/websockets/
- Conexiones WebSocket para geolocalización en tiempo real
- Eventos de estado de órdenes
- Notificaciones al supervisor

### packages/api/src/integrations/
- Integración con sistema administrativo del ISP
- Webhooks de entrada/salida
- Mappers de datos

---

### packages/panel-web/src/app/
- **router/**: Configuración centralizada de rutas con lazy loading
- **providers/**: Providers globales (QueryClient, Theme, Auth)

### packages/panel-web/src/modules/
Cada módulo sigue estructura feature-first:
- **pages/**: Componentes de página (ruteables)
- **components/**: Componentes específicos del módulo
- **hooks/**: Custom hooks del módulo
- **services/**: Llamadas a API del módulo
- **types/**: TypeScript interfaces/types del módulo
- **validators/**: Schemas Zod para validación

### packages/panel-web/src/shared/
- **components/**: Componentes reutilizables (DataTable, Map, Cards, Modal, etc.)
- **hooks/**: Hooks globales (useDebounce, useLocalStorage, useMediaQuery)
- **services/**: Cliente HTTP base (Axios instance), WebSocket client
- **layouts/**: Layouts (AuthLayout, DashboardLayout)
- **contexts/**: Contextos globales (AuthContext, ThemeContext)
- **utils/**: Utilidades (formatters, constants, helpers)

## Decisiones Arquitectónicas

### 1. Monorepo con estructura packages/
**Razón:** Separación clara entre frontend y backend, pero en un mismo repositorio para facilitar desarrollo y despliegue coordinado.

### 2. Feature-first modules
**Razón:** Escalabilidad. Cada módulo es autocontenido. Se puede desarrollar, probar y escalar independientemente.

### 3. API REST + WebSockets
**Razón:** REST para operaciones CRUD y consultas. WebSockets para geolocalización en tiempo real y notificaciones.

### 4. Prisma + PostgreSQL + PostGIS
**Razón:** Prisma ofrece type-safety y migrations automáticas. PostGIS permite consultas geoespaciales (distancia, zonas, mapas de calor).

### 5. Redis + BullMQ
**Razón:** Redis para cache (dashboard, reportes) y sesiones. BullMQ para procesamiento asíncrono (integración con sistema externo, notificaciones).

### 6. TanStack Query
**Razón:** Cache automático, refetch inteligente, optimistic updates. Ideal para dashboards y listas con filtros.

### 7. Shadcn UI + Radix
**Razón:** Componentes accesibles, personalizables con Tailwind. Sin dependencias pesadas de UI libraries.

### 8. Zod para validación compartida
**Razón:** Schemas de validación que pueden compartirse entre frontend y backend, asegurando consistencia.

## Modelo de Datos (Prisma)

### Tablas Principales:
- **User**: Usuarios del sistema (supervisores, admins)
- **Role**: Roles y permisos
- **WorkOrder**: Órdenes de trabajo
- **WorkOrderStatus**: Historial de estados
- **Crew**: Cuadrillas
- **Technician**: Técnicos
- **Vehicle**: Vehículos
- **Customer**: Clientes
- **CustomerAddress**: Domicilios
- **Equipment**: Equipos instalados
- **Inventory**: Stock por cuadrilla
- **Material**: Catálogo de materiales
- **ChecklistItem**: Items de checklist
- **Photo**: Fotos de órdenes
- **Signature**: Firmas digitales
- **AuditLog**: Auditoría
- **SLA**: Configuración de SLA
- **Notification**: Notificaciones

## Flujo de Datos

1. Sistema Administrativo → Webhook/API → Atlas API
2. Atlas API crea WorkOrder desde Ticket
3. Supervisor visualiza en Panel Web
4. Supervisor asigna WorkOrder a Crew
5. Crew recibe notificación en App Móvil
6. Técnico ejecuta OT, actualiza estado desde App
7. Panel Web refleja cambios en tiempo real vía WebSocket
8. Atlas API notifica Sistema Administrativo del cierre

## Seguridad

- JWT con refresh tokens
- Roles: SuperAdmin, Admin, Supervisor, Viewer
- Permisos a nivel de módulo y acción (create, read, update, delete)
- Rate limiting por endpoint
- Validación estricta con DTOs + Zod
- Auditoría de todas las operaciones críticas
- HTTPS obligatorio en producción