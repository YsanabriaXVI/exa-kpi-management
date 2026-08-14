# EXA KPI System — Contexto para un nuevo chat

## Objetivo

EXA KPI System es una aplicación para definir, configurar, asignar, monitorear y reportar KPI y ScoreCards del grupo EXA.

## Stack

- Frontend: React 18, TypeScript y Vite.
- Navegación: React Router.
- Estado de servidor: TanStack Query.
- Iconos: Lucide React.
- Validación: Zod.
- Backend: Express y TypeScript.
- Base de datos prevista: MySQL 8.
- Acceso previsto a datos: SQL directo con `mysql2`, sin ORM.
- Contenedores: Docker Compose.

## Reglas de arquitectura

- Organizar el código por módulo o feature.
- Mantener la lógica de negocio fuera de los componentes React.
- Los controllers del backend deben manejar únicamente HTTP.
- Los services deben contener reglas de negocio.
- Los repositories deben contener SQL.
- Validar requests con Zod.
- Utilizar DTO y tipos para los payloads.
- No introducir Nest.js ni un ORM.
- No modificar módulos no relacionados al implementar una funcionalidad.
- Mantener soporte para modo claro y oscuro.

## Flujo general del frontend

```text
frontend/index.html
        ↓
frontend/src/main.tsx
        ↓
frontend/src/router.tsx
        ↓
frontend/src/app/layout/AppLayout.tsx
        ↓
Componente correspondiente a la ruta
```

`main.tsx` monta React, configura TanStack Query, carga los estilos globales y entrega el control a React Router.

`router.tsx` relaciona las URL con las pantallas React.

`AppLayout.tsx` contiene el sidebar, header, área principal, navegación móvil y estado del tema claro/oscuro.

## Estructura principal del frontend

```text
frontend/src/
├── app/
│   ├── layout/          # Layout y header global
│   ├── navigation/      # Configuración de opciones del sidebar
│   └── sidebar/         # Renderizado e interacción del sidebar
├── components/          # Componentes compartidos
├── features/            # Módulos funcionales
├── pages/               # Landings y placeholders genéricos
├── shared/
│   ├── api/             # Cliente HTTP compartido
│   └── constants/       # Constantes comunes
├── styles/              # Tema, estilos globales y sidebar
├── main.tsx             # Entrada de React
├── router.tsx           # Rutas de la aplicación
└── App.tsx              # Archivo residual; no es la entrada activa
```

## Módulos del frontend

### KPI Definition

Ubicación: `frontend/src/features/kpi-definition/`

- `KpiDefinitionOverview.tsx`: listado, filtros y acciones.
- `KpiDefinitionDetail.tsx`: detalle de una definición.
- `KpiDefinitionModal.tsx`: formulario modal de creación o edición.
- `CategoryModal.tsx`: administración o selección de categorías.
- `CheckboxMultiSelect.tsx`: multiselect con checkbox y chips.
- `kpi-definition.types.ts`: tipos TypeScript.
- `kpi-definition.schema.ts`: validaciones Zod.
- `kpi-definition.service.ts`: servicio simulado con arrays en memoria.
- `kpi-definition.css`: estilos del módulo.

### KPI Config

Ubicación: `frontend/src/features/kpi-config/`

- `KpiConfigOverview.tsx`: listado de configuraciones.
- `SetKpiConfigPage.tsx`: formulario de configuración.
- `KpiConfigDetail.tsx`: detalle de configuración.
- `TrafficLightEditor.tsx`: edición de rangos de semáforo.
- `ConfigMultiSelect.tsx`: filtros multiselect.
- Archivos `.types.ts`, `.service.ts` y `.css`: tipos, datos y presentación.

### KPI Pool

Ubicación: `frontend/src/features/kpi-pool/`

- `KpiPoolOverview.tsx`: listado de pools.
- `KpiPoolInfo.tsx`: creación o información principal.
- `KpiPoolDetail.tsx`: detalle y contenido del pool.
- `ManagePoolKpis.tsx`: agregar o retirar KPI.
- `PoolOverviewMultiSelect.tsx`: filtros multiselect.
- Archivos `.types.ts`, `.service.ts`, `.data.ts` y `.css`: tipos, datos simulados y estilos.

### ScoreCards

Ubicación: `frontend/src/features/scorecards/`

- `ScorecardOverview.tsx`: listado general.
- `CreateScorecardInfo.tsx`: creación de información principal.
- `ScorecardDetail.tsx`: detalle.
- `ScorecardAssignment.tsx`: asignación de KPI y ScoreCards vinculados.
- `SelectAssignmentItems.tsx`: selección de KPI o ScoreCards vinculados.
- `ScorecardMultiSelect.tsx`: multiselect del módulo.
- Archivos `.types.ts`, `.service.ts`, `.data.ts` y `.css`: tipos, datos y estilos.

### Monitoring Results

Ubicación: `frontend/src/features/monitoring-results/`

- `MonitoringOverview.tsx`: resumen de monitoreo.
- `PoolInputSchedule.tsx`: calendario de captura.
- `MonitoringResultsDetail.tsx`: detalle de resultados.
- `AttachedScorecards.tsx`: ScoreCards asociados.
- `ResultEntry.tsx`: flujo de captura, revisión y cierre.
- `MonitoringResultContext.tsx`: contexto reutilizable del periodo.
- `monitoring-results.data.ts`: datos simulados.
- `monitoring-results.css`: estilos.

### Reports

Ubicación: `frontend/src/features/reports/`

- `LatestScorecardResults.tsx`: últimos resultados, filtros, resumen, Final Score, Final Composition y Traffic Light.
- `ScorecardResultsHistory.tsx`: matriz histórica con vistas de 4, 6 y 12 meses.
- `ScorecardResultDetail.tsx`: desglose de un resultado.
- `ReportsAnalysis.tsx`: selector entre análisis de ScoreCards y KPI.
- `ScorecardAnalysis.tsx`: comparación de ScoreCards.
- `KpiAnalysis.tsx`: tendencias y benchmarking de KPI.
- `AnalysisMultiSelect.tsx`: multiselect compartido por análisis.
- `reports.data.ts`: datos simulados de reportes.
- Archivos CSS: estilos generales y ajustes específicos por pantalla.

## Navegación y estilos globales

- `frontend/src/app/navigation/sidebar.config.ts`: estructura del sidebar y rutas.
- `frontend/src/app/sidebar/Sidebar.tsx`: comportamiento visual del sidebar.
- `frontend/src/styles/globals.css`: estilos base.
- `frontend/src/styles/sidebar.css`: layout, header y sidebar.
- `frontend/src/styles/ems-theme.css`: variables y reglas para modo claro y oscuro.

Los colores deben utilizar variables como:

```css
color: var(--ems-text);
background: var(--ems-surface);
border-color: var(--ems-border);
```

El tema se controla mediante:

```html
<html data-theme="dark">
```

## Estado actual de los datos

La mayor parte del sistema utiliza arrays y datos simulados.

Las fuentes actuales son:

- Archivos `*.data.ts`.
- Arrays definidos dentro de componentes.
- Archivos `*.service.ts` que simulan llamadas asíncronas.
- Un array fijo dentro del controller demo del backend.

Ejemplo:

```ts
export const reportScorecards = [
  {
    code: "SC-001",
    name: "EXA Operations",
    score: 93.79,
  },
];
```

Los componentes filtran estos datos mediante `useMemo`, `filter`, `map` y estados `useState`.

Algunos services mantienen datos en memoria:

```ts
let definitions = [...initialDefinitions];
```

Estos datos no representan persistencia real. Pueden perderse al recargar o reiniciar la aplicación.

## Estado actual del backend

El backend es todavía un starter técnico.

```text
backend/src/
├── config/
│   └── env.ts
├── controllers/
│   └── demo.controller.ts
├── middleware/
│   └── error.middleware.ts
├── routes/
│   └── demo.routes.ts
├── schemas/
│   └── demo.schema.ts
├── app.ts
└── main.ts
```

### Archivos principales

- `main.ts`: inicia Express en el puerto configurado.
- `app.ts`: configura Helmet, CORS, JSON, rutas y middleware de errores.
- `config/env.ts`: valida variables de entorno con Zod.
- `routes/demo.routes.ts`: define `GET /api/demo` y `POST /api/demo`.
- `controllers/demo.controller.ts`: responde con datos simulados.
- `schemas/demo.schema.ts`: valida el POST demo.
- `middleware/error.middleware.ts`: maneja errores Zod y errores generales.

### Endpoints existentes

```text
GET  /api/health
GET  /api/demo
POST /api/demo
```

No existen todavía endpoints reales para KPI Definition, KPI Config, KPI Pool, ScoreCards, Monitoring Results, Reports o Roles/Users.

## Estado de MySQL

MySQL está configurado en Docker, pero el backend todavía no está conectado realmente.

Existe:

- Contenedor MySQL.
- Contenedor Adminer.
- Dependencia `mysql2` instalada.
- Variables de entorno preparadas.
- Una migración placeholder para `demo_items`.
- Un seed con registros demo.

No existe todavía:

- Pool de conexiones `mysql2`.
- Repositories con SQL.
- Services de negocio reales.
- Migraciones de los módulos.
- Persistencia desde el frontend.

El endpoint `/api/demo` no consulta `demo_items`; devuelve un array escrito directamente en el controller.

## Docker

`docker-compose.yml` levanta:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:4000
MySQL:    localhost:3306
Adminer:  http://localhost:8080
```

Credenciales actuales de desarrollo:

```text
Database: exa_kpi_db
User: exa_user
Password: exa_password
```

## Flujo actual y flujo objetivo

Flujo actual:

```text
Componente React
      ↓
Array o service simulado
      ↓
Renderizado de pantalla
```

Flujo objetivo:

```text
React + TanStack Query
        ↓
API Express
        ↓
Route
        ↓
Controller HTTP
        ↓
Zod Schema
        ↓
Service de negocio
        ↓
Repository SQL
        ↓
MySQL 8
```

## Arquitectura objetivo de un módulo backend

Ejemplo para KPI Definition:

```text
backend/src/modules/kpi-definition/
├── kpi-definition.routes.ts
├── kpi-definition.controller.ts
├── kpi-definition.service.ts
├── kpi-definition.repository.ts
├── kpi-definition.schema.ts
└── kpi-definition.types.ts
```

Responsabilidades:

- Route: relaciona endpoint y controller.
- Controller: maneja HTTP y códigos de respuesta.
- Schema: valida params, query y body.
- Service: aplica reglas de negocio.
- Repository: ejecuta SQL con `mysql2`.
- Types/DTO: define contratos TypeScript.

## Estado resumido

| Área | Estado |
|---|---|
| Frontend visual | Avanzado |
| Navegación | Implementada |
| Modo oscuro | Implementado y en ajuste continuo |
| Filtros y multiselect | Implementados en múltiples módulos |
| Datos del frontend | Principalmente mocks y arrays |
| Express | Implementado |
| Zod backend | Implementado en demo |
| Manejo de errores | Básico |
| MySQL Docker | Configurado |
| `mysql2` | Instalado, no utilizado |
| API de negocio | No implementada |
| Repositories SQL | No implementados |
| Autenticación | No implementada |
| Frontend conectado a API | Pendiente |

## Próximo paso recomendado

Implementar un módulo vertical completo comenzando por KPI Definition:

1. Crear migraciones SQL reales.
2. Incorporar las variables DB al schema de entorno.
3. Crear el pool MySQL con `mysql2/promise`.
4. Crear repository con SQL parametrizado.
5. Crear service con reglas de negocio.
6. Crear schemas Zod para requests.
7. Crear controller y routes.
8. Agregar manejo de errores 404 y 409.
9. Conectar el service del frontend al API.
10. Utilizar TanStack Query para listar, crear y actualizar.
11. Sustituir los arrays del módulo únicamente después de verificar la API.

Después de establecer este patrón, replicarlo en KPI Config, KPI Pool, ScoreCards, Monitoring Results, Reports y Roles/Users.

## Instrucción sugerida para iniciar el próximo chat

```text
Este archivo contiene el contexto actual de EXA KPI System. Léelo antes de hacer cambios. Conserva la arquitectura React + Express + MySQL, utiliza SQL directo con mysql2, validación Zod y separación controller/service/repository. El frontend actualmente usa principalmente mocks. Ayúdame a continuar desde este estado sin modificar módulos no relacionados.
```
