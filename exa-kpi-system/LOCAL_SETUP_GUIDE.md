# Local Setup Guide

Esta guía explica cómo actualizar y ejecutar EXA KPI System en una laptop personal o empresarial, incluyendo equipos que usan XAMPP.

## Requisitos

- Git
- Docker Desktop ejecutándose
- Node.js y npm
- MySQL de XAMPP detenido, o disponible en un puerto diferente de `3306`

## Actualización normal

Abre PowerShell en la carpeta `exa-kpi-system`, donde se encuentran `frontend`, `backend` y `README.md`.

```powershell
git pull origin main
docker compose -f backend/docker-compose.yml up -d --build
```

Después inicia el frontend:

```powershell
Set-Location frontend
npm install
npm run dev
```

Abre `http://localhost:5173`.

## Si Git no permite hacer pull

Si Git muestra que los cambios locales serían sobrescritos, guárdalos temporalmente:

```powershell
git stash push -m "cambios locales antes del pull"
git pull origin main
git stash pop
```

Si el conflicto está solamente en `frontend/package-lock.json`, entra a `frontend` y ejecuta `npm install` para regenerar las dependencias después de resolver el conflicto.

## Conflicto con MySQL de XAMPP

XAMPP normalmente usa el puerto `3306`, el mismo puerto que MySQL de Docker intenta publicar.

La solución recomendada es detener solamente MySQL desde el panel de XAMPP. Apache puede continuar ejecutándose. Luego levanta nuevamente el backend:

```powershell
docker compose -f backend/docker-compose.yml down
docker compose -f backend/docker-compose.yml up -d --build
```

Para confirmar si otro programa está usando `3306`:

```powershell
netstat -ano | findstr :3306
```

### Usar XAMPP y Docker al mismo tiempo

Crea el archivo `backend/.env` con:

```env
MYSQL_PORT=3307
```

Luego recrea los contenedores:

```powershell
docker compose -f backend/docker-compose.yml down
docker compose -f backend/docker-compose.yml up -d --build
```

Los microservicios seguirán conectándose internamente a MySQL por `3306`; solamente el acceso desde Windows cambiará a `3307`.

## Verificar que el backend funciona

Consulta el estado de los contenedores:

```powershell
docker compose -f backend/docker-compose.yml ps
```

`exa-kpi-mysql` debe aparecer como `healthy`. Los microservicios principales deben aparecer como `running`.

Revisa KPI Management:

```powershell
docker compose -f backend/docker-compose.yml logs --tail 150 exa-kpi-management-service
```

El log debe indicar que las migraciones se aplicaron, que el seed terminó y que el servicio inició.

Prueba los catálogos directamente:

```powershell
Invoke-RestMethod http://localhost:4001/api/v1/catalog-management/subject-types
Invoke-RestMethod http://localhost:4001/api/v1/catalog-management/measurement-units
Invoke-RestMethod http://localhost:4001/api/v1/catalog-management/data-sources
```

Cada respuesta debe contener una propiedad `data` con registros.

## Si la pantalla carga pero no muestra datos

Ejecuta y revisa estas salidas:

```powershell
docker compose -f backend/docker-compose.yml ps
docker compose -f backend/docker-compose.yml logs --tail 100 exa-kpi-management-service
docker compose -f backend/docker-compose.yml logs --tail 100 mysql
Invoke-RestMethod http://localhost:4001/api/v1/catalog-management/measurement-units
```

Interpretación rápida:

- `404`: el backend está desactualizado o no fue reconstruido.
- `Connection refused`: KPI Management no está ejecutándose.
- `Authentication failed`: MySQL conserva credenciales incompatibles.
- El endpoint devuelve datos, pero la pantalla no: revisa `frontend/.env` y reinicia Vite.

El archivo `frontend/.env` debe contener:

```env
VITE_API_BASE_URL=http://localhost:4001/api
VITE_KPI_POOL_API_BASE_URL=http://localhost:4002/api
```

Después de modificarlo, detén `npm run dev` con `Ctrl+C` y vuelve a ejecutarlo.

## Reiniciar únicamente KPI Management

```powershell
docker compose -f backend/docker-compose.yml up -d --build --force-recreate exa-kpi-management-service
```

## Diferencias de datos entre computadoras

Git sincroniza código, no bases de datos. Cada laptop usa su propio volumen local de MySQL. Los registros agregados manualmente en una computadora no aparecen automáticamente en otra.

`docker compose up -d --build` aplica migraciones y ejecuta los seeds, pero no copia la base de datos de otra laptop.

## Reconstrucción completa de la base local

Usa esta opción únicamente si no necesitas conservar los datos locales.

> Advertencia: este procedimiento elimina todas las bases almacenadas en los volúmenes Docker de este proyecto.

```powershell
docker compose -f backend/docker-compose.yml down -v
docker compose -f backend/docker-compose.yml up -d --build
```

No uses `down -v` como parte de una actualización normal.

## Detener el backend sin eliminar datos

```powershell
docker compose -f backend/docker-compose.yml down
```
