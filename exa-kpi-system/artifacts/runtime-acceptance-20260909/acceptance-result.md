# Aceptación runtime completada: agosto → septiembre

Ejecución mediante HTTP/PowerShell y lecturas de base de datos mediante Docker.
No se crearon ni ejecutaron pruebas automatizadas. No se modificó código.

## Resultado

| Evidencia | Agosto 2026 | Septiembre 2026 |
| --- | --- | --- |
| Monitoring period ID | 37 | 38 |
| Estado | CLOSED | DRAFT |
| Versión del período | 6 | 1 |
| resultsVersion | 1 | 0 |
| baselineVersion | 0 | 0 |
| Inputs | 1: ID 76 | 1: ID 77 |
| Resultados persistidos | 1: ID 64, valor 90 | 0 |
| Checks persistidos | 1: ID 51 | 0 |
| Resoluciones de baseline | 0 | 0 |
| Score preview/final | 90 / 90 | null / null |
| goalMet | false | Sin resultado calculado |
| Eventos de workflow | 3 | 0 |

Definition 2, Configuration 3, revision 3, Pool 1, Membership 1 y Scorecard 1.
Target 100, weight 100%, HIGHER_IS_BETTER, CURRENT_PERIOD, OVERALL,
PROPORTIONAL con floorPercent 0 y capPercent 100.
Fixture organizacional autorizado: departamento 2001 y colaboradora 1001.

## Acciones reales y respuestas

Las rutas siguientes usan http://localhost:4004/api/v1/monitoring-periods.
Cada archivo conserva request, status y response completos.

| Acción | Request relevante | HTTP | Evidencia |
| --- | --- | --- | --- |
| POST /37/result-entry/save-changes | resultsVersion 0; input 76; resultValue "90"; version null; sin comment | 200 | 12-august-save-retry.json |
| POST /37/check-results | expectedResultsVersion 1; expectedBaselineVersion 0 | 200 | 13-august-check.json |
| POST /37/submit | version 3 | 200: SUBMITTED, versión 4 | 14-august-submit.json |
| POST /37/approve | version 4 | 200: VALIDATED, versión 5 | 15-august-approve.json |
| POST /37/close | version 5; withExceptions false | 200: CLOSED, versión 6 | 16-august-close.json |
| POST /37/next-period | {} | 201: período 38 DRAFT | 18-september-initialize.json |

La transición de workflow a VALIDATED utiliza /approve.
El score calculado fue 90.000000, goalMet=false, sin findings y con cobertura
de peso 100%. La clasificación GREEN proviene del semáforo configurado y no
cambia goalMet.

## Cierre reconocido por Pool y JetStream

GET http://localhost:4002/api/v1/kpi-pools/1/input-periods devolvió HTTP 200.
Septiembre informó previousMonitoringStatus=CLOSED, canFinalize=true y
reasonCode=null antes de Initialize Next Period.

El consumidor exa-kpi-pool-monitoring-closures-v1 recibió y confirmó stream
sequence 7, consumer sequence 2; num_pending=0 y num_ack_pending=0.
El ACK ocurrió en 2026-09-09T19:17:24.133268164Z.
Evidencias: 17-pool-closure.json y 24-jetstream-after-close.json.

## Agosto conservado y protegido

Después de inicializar septiembre, GET /37/result-entry conservó resultado 90,
score final 90, goalMet=false y versión 6.
El scoringSnapshot del check 51 coincide exactamente con el obtenido antes
de Submit, según la comparación del JSON serializado.

La lectura persistida conserva effectiveSettingsSnapshot, la regla proporcional,
target 100, weight 100 y los snapshots de Scorecard y departamento.
Auditoría: eventos 17 (SUBMIT), 18 (APPROVE), 19 (CLOSE), closure ID 5 NORMAL
y revisión del resultado conservada.

Un POST /37/result-entry/save-changes con resultsVersion 1, input 76,
resultValue "90" y result version 1 fue rechazado:

```json
{"error":{"code":"MONITORING_PERIOD_NOT_DRAFT","message":"Results can only be changed while the Monitoring Period is DRAFT"}}
```

HTTP 409 esperado. No se alteró el resultado. Evidencia: 23-august-readonly.json.

## Septiembre limpio

GET /38/result-entry devuelve NOT_CHECKED, ningún run, resultado null,
scoring null, ningún método de captura seleccionado y todas las columnas
de score en null. GET /38/check-results/runs devuelve runs=[].

La consulta del historial de baseline para el input 77 respondió
BASELINE_NOT_REQUIRED: este caso CURRENT_PERIOD no necesita baseline.
Por ello el conteo exacto se obtuvo por lectura de la base de datos: cero
HistoricalBaselineResolution para septiembre, igual que para agosto.

25-persisted-periods.json contiene los registros completos de ambos períodos
con snapshots, resultados, revisiones, baselines, checks, auditoría y cierre.
26-persisted-counts.json contiene los conteos derivados de esos registros.
No hay resultados, scores, checks ni baselines heredados en septiembre.
