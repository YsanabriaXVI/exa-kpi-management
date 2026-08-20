# EXA KPI System

Sistema modular de KPIs construido con React, TypeScript y microservicios Express.

## Estructura vigente

```text
exa-kpi-system/
|-- frontend/
|-- backend/
|   |-- exa-kpi-management-service/
|   |-- infrastructure/
|   |-- docker-compose.yml
|   `-- BACKEND_CONTEXT.md
|-- database/
`-- PROJECT_CONTEXT.md
```

El backend genérico de demostración fue retirado. Cada dominio debe implementarse
como un microservicio independiente dentro de `backend/`.

## Ejecutar infraestructura y KPI Management

```powershell
cd backend
docker compose up -d --build
```

Servicios disponibles:

```text
KPI Management: http://localhost:4001
Swagger:        http://localhost:4001/api/docs
MySQL:          localhost:3306
Adminer:        http://localhost:8080 (perfil tools)
```

Para levantar también Adminer:

```powershell
docker compose --profile tools up -d
```

## Ejecutar el frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

## Documentación

- `PROJECT_CONTEXT.md`: contexto funcional y estado general del frontend.
- `backend/BACKEND_CONTEXT.md`: arquitectura y reglas compartidas de microservicios.
- `backend/exa-kpi-management-service/README.md`: operación de KPI Management.
