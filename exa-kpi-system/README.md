# EXA KPI System

Proyecto base con:

- Frontend: React + TypeScript + Vite
- Backend: Express + TypeScript
- Sidebar inicial basado en el documento `21-Jul-2026- KPIS EXA Project Structure.docx`
- Backend demo con una ruta `GET /api/demo` y `POST /api/demo`

## Estructura

```txt
exa-kpi-system/
├── frontend/
├── backend/
├── docker-compose.yml
├── AGENTS.md
└── README.md
```

## Ejecutar sin Docker

### Backend

```bash
cd backend
npm install
npm run dev
```

Servidor backend:

```txt
http://localhost:4000
```

Endpoints demo:

```txt
GET  http://localhost:4000/api/demo
POST http://localhost:4000/api/demo
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```txt
http://localhost:5173
```

## Ejecutar con Docker

```bash
docker compose up --build
```

Servicios:

```txt
Frontend: http://localhost:5173
Backend:  http://localhost:4000
MySQL:    localhost:3306
Adminer:  http://localhost:8080
```

## Próximo paso sugerido

1. Conectar frontend con backend usando `src/shared/api/http-client.ts`.
2. Crear módulo real de `KPI Definition`.
3. Crear migraciones SQL y seeders.
4. Agregar auth básica.
