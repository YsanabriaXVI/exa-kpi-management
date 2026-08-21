<!-- La base técnica de exa-scorecards-service ya está lista, pero todavía falta implementar el dominio funcional.

  Prioridad inmediata:

  1. Cerrar el contrato con KPI Pool

  El evento kpi.pool.period.composition.finalized.v1 necesita incluir IDs estables de:

  - Pool Period
  - Pool Composition
  - memberships/configuraciones finalizadas

  Sin eso, Scorecards no puede demostrar exactamente qué composición del Pool utilizó.

  2. Activar el consumer NATS real

  Una vez cerrado el contrato:

  - consumir activación, desactivación, extensión y finalización del Pool;
  - actualizar pool_references;
  - actualizar pool_period_references;
  - utilizar processed_events;
  - probar redelivery e idempotencia.

  3. Implementar Scorecard Information

  Backend real para:

  - listar Scorecards con paginación, búsqueda, filtros y sorting;
  - crear Scorecard;
  - generar SC-OPS-01-2026;
  - validar Pool ACTIVE;
  - heredar Companies y Schedule;
  - validar Departments dentro del alcance del Pool;
  - actualizar nombre, descripción y asignaciones permitidas;
  - desactivar sin borrar historia. -->

  <!-- 4. Reemplazar mocks del frontend

  Actualmente Overview, Detail y Assignment todavía dependen parcialmente del servicio en memoria. Falta conectarlos gradualmente al puerto 4003.

  5. Composición por Input Period

  Implementar:

  - selector de período heredado del Pool;
  - obtener composición FINALIZED del Pool;
  - listar KPIs disponibles;
  - agregar/quitar KPIs del Scorecard;
  - persistir pesos por período;
  - impedir seleccionar KPIs ajenos a esa composición.

  6. Linked Scorecards

  - agregar/quitar Scorecards vinculados por período;
  - pesos temporales;
  - impedir autorreferencia;
  - validar circularidad antes de finalizar.

  7. Finalización

  El backend debe validar:

  - Pool Composition finalizada;
  - KPIs pertenecientes al Pool y período correctos;
  - ausencia de duplicados;
  - Scorecard no inactivo;
  - suma KPI + Linked Scorecards exactamente 100.0000;
  - composición todavía PREPARING.

  Luego, transaccionalmente:

  - composición → FINALIZED;
  - primera finalización: Scorecard DRAFT → ACTIVE;
  - crear evento Outbox scorecard.composition.finalized.v1.

  8. Conectar Pool Period Schedule

  Reemplazar Integration Pending solamente cuando existan contratos reales para mostrar estados de Scorecards. Monitoring debe continuar pendiente hasta crear su
  servicio. -->

  9. Pruebas faltantes

  Especialmente:

  - Pool inexistente/inactivo;
  - Department fuera del scope;
  - concurrencia del código;
  - composición de Pool no finalizada;
  - KPI fuera del Pool;
  - pesos menores, mayores e iguales a 100;
  - self-link y circularidad;
  - doble finalización;
  - activación inicial;
  - Outbox e idempotencia NATS;
  - paginación, filtros y BigInt JSON;
  - smoke completo MySQL/NATS.

  10. Deuda técnica menor

  - Migrar configuración de Prisma a prisma.config.ts antes de Prisma 7.
  - Revisar las tres vulnerabilidades altas de dependencias.

  El siguiente paso correcto es cerrar el contrato Pool → Scorecards y después implementar el CRUD real de Scorecard Information. Sin ese contrato, empezar Assignment
  obligaría a inventar IDs o depender demasiado de REST.