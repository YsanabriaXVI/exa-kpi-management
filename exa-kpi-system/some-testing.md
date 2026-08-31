# Testing del sistema de KPIs de EXA

Este documento resume cómo se valida el proyecto y contiene los comandos más importantes para ejecutar pruebas, comprobaciones de tipos y verificaciones manuales.

## Estrategia de testing

El proyecto utiliza principalmente estas capas de validación:

1. **Pruebas unitarias:** comprueban reglas de negocio y funciones aisladas.
2. **Pruebas de servicios y rutas:** validan controladores, respuestas HTTP, estados y códigos de error.
3. **Pruebas de integración:** verifican flujos que requieren base de datos u otros servicios.
4. **Type checking:** detecta incompatibilidades de TypeScript sin ejecutar la aplicación.
5. **Build del frontend:** confirma que React y Vite pueden generar una versión de producción.
6. **Smoke testing:** comprueba rápidamente que los contenedores y endpoints principales respondan.

Los backends utilizan **Vitest**. El frontend actualmente dispone de lint, validación TypeScript y build, pero no tiene configurada una suite automatizada de componentes o end-to-end.

## Preparación

Desde la raíz del proyecto, iniciar los contenedores:

```powershell
cd backend
docker compose up -d --build
docker compose ps
```

La base de datos se conserva en el volumen Docker `mysql_data`.

## Ejecutar todas las pruebas de cada microservicio

### KPI Management

```powershell
cd backend/exa-kpi-management-service
npm install
npm test
```

### KPI Pool

```powershell
cd backend/exa-kpi-pool-service
npm install
npm test
```

### Scorecards

```powershell
cd backend/exa-scorecards-service
npm install
npm test
```

### Monitoring

```powershell
cd backend/exa-monitoring-service
npm install
npm test
```

`npm install` solamente es necesario la primera vez o después de modificar dependencias.

## Ejecutar una prueba específica

Vitest permite indicar el archivo que se desea probar:

```powershell
cd backend/exa-kpi-pool-service
npm test -- src/tests/kpi-pool-membership.service.test.ts
```

Ejemplo para ejecutar pruebas cuyo nombre coincida con un texto:

```powershell
npm test -- -t "lists an editable Pool"
```

Modo interactivo disponible en los servicios que incluyen `test:watch`:

```powershell
npm run test:watch
```

## Type checking y compilación de backends

Ejecutar dentro de cada microservicio:

```powershell
npm run typecheck
npm run build
```

Esto valida TypeScript y genera el directorio compilado `dist`.

## Validación del frontend

```powershell
cd frontend
npm install
npm run lint
npm run build
```

Para iniciar el frontend en desarrollo:

```powershell
npm run dev
```

Direcciones habituales:

```text
Local: http://localhost:5173
Red empresarial: http://192.168.1.153:5173
```

La dirección de red puede cambiar si la PC recibe una IP diferente.

## Pruebas de integración

Las pruebas de integración utilizan una base de datos real y pueden modificar datos de prueba. Deben ejecutarse en un ambiente preparado para testing, no contra producción.

### KPI Pool

```powershell
cd backend/exa-kpi-pool-service
npm run test:integration
```

### Monitoring

```powershell
cd backend/exa-monitoring-service
npm run test:integration
```

## Verificación rápida de contenedores

```powershell
cd backend
docker compose ps
docker compose logs --tail 100 exa-kpi-management-service
docker compose logs --tail 100 exa-kpi-pool-service
docker compose logs --tail 100 exa-scorecards-service
docker compose logs --tail 100 exa-monitoring-service
```

Para seguir los logs de un servicio en tiempo real:

```powershell
docker compose logs -f exa-kpi-pool-service
```

Salir del seguimiento con `Ctrl + C`.

## Smoke testing de las APIs

Desde PowerShell en la PC que ejecuta Docker:

```powershell
Invoke-RestMethod http://localhost:4001/api/health/live
Invoke-RestMethod http://localhost:4002/api/health/live
Invoke-RestMethod http://localhost:4003/api/health/live
Invoke-RestMethod http://localhost:4004/api/health/live
```

Cada petición debe responder con estado HTTP `200` y un estado similar a `ok` o `live`.

Desde otra computadora conectada a la misma red:

```text
http://192.168.1.153:4001/api/health/live
http://192.168.1.153:4002/api/health/live
http://192.168.1.153:4003/api/health/live
http://192.168.1.153:4004/api/health/live
```

## Validación recomendada antes de entregar cambios

1. Ejecutar `npm test` en el microservicio modificado.
2. Ejecutar `npm run typecheck` en ese microservicio.
3. Ejecutar `npm run build` en el frontend si se modificó React o un contrato de API.
4. Ejecutar `npm run lint` en el frontend.
5. Confirmar `docker compose ps`.
6. Probar los endpoints de salud.
7. Realizar manualmente el flujo funcional modificado.

Ejemplo para un cambio que involucra KPI Pool y frontend:

```powershell
cd backend/exa-kpi-pool-service
npm test
npm run typecheck

cd ../../frontend
npm run lint
npm run build

cd ../backend
docker compose up -d --build exa-kpi-pool-service
docker compose ps
```

## Qué reportar como evidencia

Al entregar una tarea conviene indicar:

- Archivos o módulos modificados.
- Pruebas ejecutadas y cantidad de pruebas aprobadas.
- Resultado de TypeScript, lint y build.
- Endpoint o flujo probado manualmente.
- Pruebas omitidas y motivo.
- Riesgos o trabajo pendiente conocido.
