# Step 11.5 — Historical Baseline Resolution

Implementado como extensión de Check Results. No se implementó Step 12.

## 1. Propagación de contratos

KPI Management emite explícitamente periodScope, comparisonMode, comparisonDirection,
targetKind, historicalCapabilityVersion e inputFrequency (ID, código, monthsPerPeriod).
Se conservan goal, goalUnit, measurementUnit, identidades Definition/Configuration/Revision
y los sujetos. Pool, Scorecards y Monitoring declaran y validan los campos.
Los contratos siguen usando measurementUnit como nombre canónico para Result Unit.
La fixture compartida historical-effective.json verifica los límites entre servicios.

## 2. Ejecutabilidad histórica

HISTORICAL_COMPARISON_V1 admite PREVIOUS_PERIOD y SAME_PERIOD_PREVIOUS_YEAR.
Exige CHANGE_TARGET, INCREASE/REDUCTION, meta positiva, unidad de meta %, unidad
de resultado compatible, frecuencia soportada y scoring proporcional aprobado.
Metadatos incompletos producen HISTORICAL_CONTRACT_INVALID; no se consulta la
configuración más reciente para reconstruir intención histórica.

## 3. Materialización

Se reemplazó el bloqueo general de históricos por validación de capacidad.
Monitoring conserva el contrato FINALIZED y crea inputs OVERALL o ENTITY.
No modifica snapshots ya materializados.

## 4. Result Entry

La captura histórica habilita exclusivamente Current Result. Un baseline pendiente
no bloquea la captura. No copia valores históricos ni modifica la fuente cerrada.

## 5. Período requerido

historical-period.ts utiliza límites autoritativos del Input Period materializado y
la cadencia congelada. Valida alineación con el calendario de Pool y resuelve
particiones de 1, 3, 4, 6 y 12 meses. PREVIOUS_PERIOD retrocede una partición;
SAME_PERIOD_PREVIOUS_YEAR retrocede doce meses conservando la partición equivalente.
La clave canónica del proyecto es YYYY-MM (mes inicial), también para períodos largos.
No se necesita que exista un período histórico materializado: el período requerido
puede anteceder la vigencia del Pool y resolverse mediante baseline manual.
Frecuencias desconocidas o límites inconsistentes producen un finding.

## 6. AUTO_MATCH

Se ejecuta perezosamente dentro de Check Results. Busca resultados no nulos, no
negativos, calculados y vigentes de períodos CLOSED, con fechas y frecuencia exactas,
unidad, semántica y sujeto compatibles. Para auto-match exige misma Definition,
comportamiento y método de scoring; prioriza la misma Configuration. La revisión
puede ser diferente. Solo elige cuando hay un único candidato en el nivel preferido.
No usa etiquetas de sujetos ni similitud de nombres. Varias coincidencias producen
HISTORICAL_BASELINE_AMBIGUOUS y no crean una resolución.

## 7. USER_MATCH

El usuario confirma sourceResultId. El backend deriva el valor, período, unidad y
provenance. Permite otra Definition/Configuration y otro Pool por confirmación
explícita, manteniendo período, unidad, semántica y sujeto compatibles y fuente CLOSED.
No acepta baselineValue, unidad ni período suministrados por el cliente.

## 8. MANUAL

Recibe value decimal no negativo y reason de 10 a 10000 caracteres.
Período requerido y unidad se derivan del contexto congelado; no son editables.
El valor cero se puede documentar, pero su comparación porcentual no es calculable.

## 9. Modelo de provenance

HistoricalBaselineResolution almacena período/input destino, sujeto, referencia,
período requerido (clave/fechas), origen, valor/unidad congelados, IDs de fuente,
provenance JSON, motivo, actor, fecha, revisionNo y baselineVersion.
Los IDs de fuente no tienen foreign keys físicas entre servicios.

## 10. Auditoría

Las resoluciones son revisiones append-only; la mayor revisionNo por input es activa.
AUTO_MATCH, USER_MATCH y MANUAL permanecen distinguibles. El historial no se
sobrescribe. La inmutabilidad es una regla del servicio, no un mecanismo antimanipulación
contra acceso SQL administrativo. Se conserva también el historial de Validation Runs.

## 11. baselineVersion

Cada cambio efectivo de resolución incrementa baselineVersion del MonitoringPeriod.
Nunca incrementa resultsVersion. Se usa el bloqueo/versionado existente del período
para serializar Save, Baseline Save y Check. Una operación con varias resoluciones
automáticas puede incrementar baselineVersion más de una vez (una por resolución).
Un no-op semántico conserva baselineVersion, scoring vigente y número de revisiones.
Cambiar origen o motivo sí es un cambio auditable.

## 12. CURRENT / STALE

Un run es CURRENT cuando coinciden basedOnResultsVersion y basedOnBaselineVersion
con sus versiones de período. Los valores materializados verifican también
currentScoringResultsVersion y currentScoringBaselineVersion.
Cambiar un baseline limpia scoring materializado y oculta el Check anterior en
las lecturas actuales, conservando su snapshot histórico. Los guards de workflow
existentes usan ambas versiones; no se añadieron nuevas transiciones.

## 13. Cálculo histórico

historicalComparison normaliza el contexto antes de calculateKpiScore:
signedChange = (Current - Baseline) / Baseline * 100.
Raw Achievement = achievedChange / targetChange * 100.
El motor existente aplica floor/cap, Goal Met, Traffic y Weighted Contribution.
La política de valores negativos del Current Result se respeta antes de normalizar;
un cambio logrado negativo es permitido como cálculo, no como Compliance negativa.

## 14. INCREASE

achievedChange = signedChange. Baseline 100000, Current 115000 y target 10%
producen achieved 15%, Raw 150%, Goal Met true y Compliance limitada por el cap.
Moverse en dirección contraria conserva Raw negativo y aplica el floor aprobado.

## 15. REDUCTION

achievedChange = -signedChange. Baseline 100000 y Current 85000 producen achieved
15%; Current 95000 produce achieved 5%. Contra target 10%, Goal Met es true/false,
respectivamente. Se reutiliza el scoring proporcional de logro normalizado.

## 16. Baseline cero

HISTORICAL_BASELINE_ZERO_UNDEFINED, NOT_CALCULABLE y campos calculados nulos.
No hay Infinity, NaN ni porcentajes inventados. Baselines negativos son incompatibles.

## 17. BY_ENTITY

Cada sujeto tiene resolución, meta, peso y scoring independiente.
Se compara subjectExternalId y tipo, nunca etiqueta. Un sujeto pendiente no impide
calcular los demás. El scorecard queda PARTIAL/BLOCKED cuando corresponda.
Group Goal continúa informativo, sin peso, contribución ni agregación.

## 18. APIs de Monitoring

Base: /api/v1/monitoring-periods/:id/inputs/:inputId

- GET /baseline-candidates: query, pool, scorecard, page; 25 resultados por página.
- PUT /baseline-resolution: expectedBaselineVersion, sourceResultId.
- POST /baseline-resolution/manual: expectedBaselineVersion, value, reason.
- GET /baseline-resolution/history: revisiones con provenance y actor/fecha.

Las rutas están documentadas en OpenAPI. Búsqueda y matching viven en el backend.
El endpoint existente de Check acepta expectedBaselineVersion opcional para conservar
compatibilidad con clientes actuales; el nuevo frontend lo envía.

## 19. Frontend

HistoricalBaseline se integra en ManualResultEntry junto a CheckResultsReview.
Muestra referencia, período requerido, valor/origen y Resolve/Change Baseline.
El diálogo permite buscar por texto de KPI/Pool/Scorecard/sujeto, paginar candidatos,
confirmar USER_MATCH o proporcionar baseline manual con fuente.
Cambios sin guardar deshabilitan Resolve; guardar baseline conserva Current Result,
actualiza cachés y muestra STALE. El usuario ejecuta Check de nuevo.
La tabla distingue Goal Unit de Result Unit y muestra cambio firmado/logrado.

## 20. ValidationRun

Se persiste basedOnBaselineVersion además de basedOnResultsVersion.
Cada evaluación histórica incluye referencia, dirección, targetKind, período requerido,
resolución con valor/unidad/origen/provenance/actor/fecha, Current Result y cambios
calculados. Conserva las métricas de scoring y pesos existentes.
El resumen incluye historicalBaselines y allRequiredHistoricalBaselinesResolved,
además de Completion, Weight Coverage, calculabilidad y readyForSubmit.

## 21. Migración

20260907210000_historical_baseline_resolution aplicada en MySQL de desarrollo.
Añade la tabla de revisiones, baselineVersion/currentScoringBaselineVersion al período
y basedOnBaselineVersion al run. Los checks previos se preservan con baseline 0.
Se generó Prisma Client local y del contenedor y se reinició Monitoring.

## 22. Unit tests

Checkpoint Step 11: 73 Monitoring, 41 frontend, 8 integraciones MySQL; typecheck
y build exitosos antes de implementar históricos.
Las suites nuevas cubren contratos, referencias temporales, cadencias, INCREASE,
REDUCTION, dirección contraria, cero, BY_ENTITY, snapshots corruptos, versiones y APIs.
Las suites de consumidor validan una fixture contractual común entre servicios.

Resultado final: KPI Management 155, Pool 60, Scorecards 37 y Monitoring 101 pruebas
unitarias/de servicio/API aprobadas. Pool omite sus 2 integraciones de eventos
fuera de este alcance. Monitoring omite 21 integraciones en la ejecución unitaria:
19 se ejecutan por separado en MySQL; las 2 de materialización contra servicios
reales no se ejecutaron en esta entrega.

## 23. Integraciones MySQL

La suite incluye 11 casos históricos y conserva 8 casos anteriores (19 total).
Cubre materialización/captura, AUTO, ambigüedad, USER entre Pools, MANUAL,
provenance, historial inmutable, no-op, versiones obsoletas, fuentes no elegibles,
período exacto del año anterior, cero, identidad de entidades y concurrencia.
Se verifica que la fuente CLOSED conserva valor y versión.
Los clientes de materialización se simulan; la persistencia y transacciones son MySQL real.

## 24. Frontend tests

47 pruebas, incluidas 6 nuevas para captura habilitada, unidades, búsqueda,
confirmación USER_MATCH, manual con provenance, conflictos, re-check, STALE,
entidades independientes y Group Goal informativo.
No se completó inspección visual en navegador: Browser no tenía ninguna conexión
disponible. Las pruebas de interfaz usan React Testing Library/JSDOM.

## 25. Typechecks, build y controles

Typechecks de los cuatro servicios y producción frontend verificados.
Prisma validate de Monitoring y Scorecards verificado; API Monitoring responde HTTP 200.
git diff --check -- . pasa para la raíz de este proyecto.
git diff --check global detecta únicamente espacios finales preexistentes en
../monitoring-steps.md (líneas 12, 20 y 21), fuera de la raíz editable.
Build mantiene el aviso existente de tamaño de chunks; no es un error de compilación.

## 26. Step 12 y límites

No se inició Step 12. Están expuestos los requisitos de captura, cobertura, Check
vigente, baselines y calculabilidad para su máquina de estados.
No se identificó un blocker de datos históricos para esa integración.
Queda pendiente la revisión visual cuando Browser esté disponible.
No se implementaron Excel, Next Period, reportes históricos, agregación Group,
fórmulas arbitrarias ni fuzzy auto-match. Las fuentes automáticas/seleccionadas
requieren CLOSED con scoring calculado vigente; no se usan DRAFT/SUBMITTED.
