Sí. Ya con la BD definida, **yo dejaría de tocar diseño conceptual por un rato y haría `Result Entry` funcional de punta a punta**. Ese módulo tiene que convertirse en la primera vertical slice real de Monitoring.

El orden que seguiría es este:

1. **Levantar `exa_monitoring` en MySQL 8**
   Ejecutar el SQL, comprobar todas las tablas, índices, checks y FKs físicas. Antes de React, confirmar que Prisma/MySQL realmente aceptan el modelo.

2. **Crear el Prisma Schema de Monitoring**
   Mapear únicamente relaciones internas de `exa_monitoring`. Pool, Scorecard, KPI Management y usuarios permanecen como **External IDs**, nunca `@relation`.

3. **Implementar `Monitoring Period`**
   Representa algo como `OPS-04-2026 + August 2026`. Al crearse debe comenzar en `DRAFT` y quedar ligado mediante External IDs al Pool y al Input Period exacto.

4. **Recibir los Scorecards finalizados del período**
   Crear `monitoring_period_scorecards` a partir de las composiciones `FINALIZED` de August 2026. Guardar IDs externos + snapshots de Code, Name y composición.

5. **Generar los Expected Results**
   Crear `monitoring_period_inputs` solamente para las KPI Configurations realmente seleccionadas por esos Scorecards. No usar todos los KPIs del Pool y no duplicar KPIs indirectamente por Linked Scorecards.

6. **Construir el endpoint principal de Result Entry**
   Debe devolver en una sola respuesta: período, Pool, status, Scorecards, Expected Results, resultados actuales y resumen `Expected / Entered / Pending`.

7. **Conectar la pantalla actual a datos reales**
   Eliminar mocks de Result Entry. La cabecera debería mostrar algo como `August 2026 · DRAFT · 10 Expected · 7 Entered · 3 Pending`.

8. **Simplificar la UI de entrada**
   Eliminar `Choose Input Method` y `Current Input Method`. En su lugar: **`Manual Entry`** y **`Excel Import`** como dos herramientas que modifican el mismo Draft.

9. **Hacer Manual Entry funcional primero**
   Mostrar cada `monitoring_period_input` con KPI, Goal, Unit, Data Source y Result editable. Permitir `Result` + `Comment`, guardar parcialmente y recuperar los datos tras refrescar.

10. **Persistir mediante Batch + Current Result**
    Cada guardado manual crea `result_entry_batch` y sus rows para auditoría. Después se crea/actualiza el único `kpi_result` actual correspondiente a ese Expected Result.

11. **Guardar historial de modificaciones**
    Si KPI-050 pasa de `80 → 85`, no perder el 80. Crear `kpi_result_revision` con actor, fecha, valor anterior/nuevo y origen de entrada.

12. **Implementar filtros operativos**
    En Result Entry necesitamos especialmente `All`, `Entered`, `Pending`, y después `Warnings/Errors`. El botón `Pending` debe permitir encontrar los faltantes inmediatamente.

13. **Implementar Excel después de Manual**
    Generar plantilla desde `monitoring_period_inputs`, descargarla, llenar Result/Comment, subirla y procesarla como `EXCEL` dentro de `result_entry_batches`.

14. **Hacer Excel `Upload → Validate → Preview → Confirm`**
    Nunca insertar al subir el archivo. Primero validar template/período/filas/duplicados/tipos, mostrar qué cambiará y solo después confirmar.

15. **Resolver conflictos Excel vs Manual**
    Si un resultado ya existe, Excel no debe sobrescribirlo silenciosamente. El Preview debe indicar `New`, `Same`, `Different Value` y exigir confirmación para reemplazar un Draft existente.

16. **Implementar `Validate Results` en DRAFT**
    Validar faltantes, formato, valores inválidos, consistencia y luego reglas de negocio. `Validate` NO cambia automáticamente el lifecycle: sigue siendo `DRAFT`.

17. **Preparar Compliance/Score como siguiente capa**
    Una vez Result Entry funcione, usamos los snapshots de Goal/Evaluation/Weight para calcular Compliance, Traffic Light y Weighted Score. Por ahora esos campos pueden permanecer `NULL`.

18. **Implementar Review & Submit**
    Mostrar resumen final y permitir `DRAFT → SUBMITTED`. Desde ese momento Manual y Excel deben quedar bloqueados hasta que exista `Return for Correction`.

19. **Implementar Return for Correction**
    `SUBMITTED → DRAFT` con motivo obligatorio y registro en `monitoring_period_status_history`. Luego Manual y Excel vuelven a habilitarse para corregir solamente lo necesario.

20. **Después conectar el resto de Monitoring**
    Con Result Entry funcionando, Monitoring Overview, Attached Scorecards y Pool Input Schedule dejan de usar mocks y simplemente consumen el estado real que ya construimos.

### La primera meta real

Yo **no le pediría todavía a Codex los 20 puntos**. La primera entrega debería ser exclusivamente:

```text
Pool August FINALIZED
        ↓
Scorecards August FINALIZED
        ↓
Monitoring Period DRAFT
        ↓
10 Expected Results
        ↓
Open Result Entry
        ↓
10 Pending
        ↓
Enter 7 manually
        ↓
Save
        ↓
7 Entered / 3 Pending
        ↓
Reload browser
        ↓
7 siguen guardados
```

Cuando eso funcione de verdad con **React → Express → Prisma → MySQL 8**, recién hacemos:

```text
Excel Template
↓
Upload / Preview / Confirm
↓
Manual + Excel juntos
↓
Validate
↓
Submit
↓
Return for Correction
```

Y después viene el siguiente demonio ☠️:

```text
Goal + Result
↓
Compliance %
↓
Traffic Light
↓
Weighted Score
↓
Linked Scorecards
↓
Final Score
```

Pero **ahorita la prioridad absoluta debería ser `Monitoring Period → Expected Results → Manual Result Entry → Partial Save`**. Si esa columna vertebral queda bien, Excel, validación y scoring se construyen sobre algo sólido en vez de sobre mocks.


Sí, Codex hizo un diagnóstico bastante bueno. Pero varias de sus “inseguridades” **ya las hemos resuelto nosotros**, otras siguen realmente abiertas, y unas cuantas **no deberían bloquear que empecemos `Result Entry`**.

Yo lo separaría así:

### Ya está decidido

1. **Estados persistidos principales**

   ```text
   DRAFT → SUBMITTED → VALIDATED → CLOSED
   ```

   `ACTIVE`, `LOCKED`, `CONTINUE_ENTRY`, etc. no deberían convertirse en nuevos estados de negocio salvo necesidad real; pueden ser estados derivados de UI.

2. **Manual + Excel**
   No son workflows distintos. Ambos escriben sobre el mismo:

   ```text
   Monitoring Period + DRAFT
   ```

   Puedes cargar 35 por Excel y completar 15 manualmente.

3. **Missing ≠ 0**
   Si falta un resultado, no existe todavía `kpi_result`/queda pendiente. `0` es un resultado real y válido, importantísimo para accidentes, robos, etc.

4. **Snapshots**
   Monitoring congela la información necesaria del KPI/Scorecard para ese Input Period:
   KPI Configuration/Revision, Goal, Unit, Evaluation, Data Source, thresholds, Weight, Scorecard, etc.

5. **Expected Results**
   No vienen de todos los KPIs del Pool. Vienen de los KPI Configurations realmente usados por los Scorecards aplicables a ese Input Period.

6. **Manual Entry puede ser parcial**

   ```text
   Expected 50
   Entered 37
   Pending 13
   ```

   Guardas y continúas después.

7. **Validar no significa Submit**
   Puedes hacer:

   ```text
   DRAFT
   → Validate
   → corregir
   → Validate
   → corregir
   ```

   y seguir en `DRAFT`.

8. **Excel no inserta inmediatamente**
   Flujo:

   ```text
   Download Template
   → Fill
   → Upload
   → Parse
   → Validate
   → Preview
   → Confirm Import
   ```

9. **Traffic Light ocurre después del Compliance**
   No se usa para descubrir cómo evaluar el KPI:

   ```text
   Goal + Result
   → Evaluation/Scoring
   → Compliance %
   → Traffic Light
   ```

10. **FKs**
    Ya está decidido:

    ```text
    misma DB / exa_monitoring
    → Physical FK

    Pool / Scorecard / KPI Management / Users
    → External ID
    → NO physical FK
    ```

---

# Parcialmente decidido

### Return for Correction

Seguro tenemos:

```text
SUBMITTED
   ↓
Return for Correction
   ↓
DRAFT
```

con justificación e historial.

Lo que **sí dejaría todavía pendiente** es:

```text
VALIDATED → DRAFT
```

Yo no lo implementaría en el primer slice. Primero hagamos el flujo normal y luego decidimos si un resultado ya validado puede “desvalidarse” y con qué permiso.

---

### Close with Exceptions

Sabemos conceptualmente que existirá:

```text
VALIDATED
↓
CLOSED
```

y excepcionalmente:

```text
CLOSED
closure_type = WITH_EXCEPTIONS
```

con permiso especial + justificación.

Pero aún falta cerrar exactamente qué combinaciones de warnings/missing permiten esa excepción.

---

### Pool/Scorecard → Monitoring

Sabemos que Monitoring debe trabajar con:

```text
Pool
+ exact Input Period
+ Scorecard compositions
+ KPI Configurations
```

Pero todavía necesitamos formalizar una regla:

> ¿Monitoring se crea solamente cuando **todos los Scorecards aplicables** al período están `FINALIZED`, o puede ir formándose incrementalmente?

Yo prefiero que el conjunto oficial de Expected Results se consolide cuando estén listas las composiciones requeridas, para que no aparezcan KPIs nuevos mientras alguien ya está capturando resultados.

---

# Lo que realmente sigue abierto

Aquí Codex sí tiene razón.

## 1. Scoring Engine ☠️

Todavía tenemos que formalizar:

```text
GREATER
LOWER
ZERO TARGET
EQUAL
RANGE
```

y:

* fórmula exacta;
* cap a 100%;
* precisión;
* redondeo;
* `Goal = 0`;
* Goal negativo si alguna vez aplica;
* Range;
* Linked Scorecards;
* Missing cerrado con excepción.

Pero **esto no bloquea Result Entry**.

Podemos guardar:

```text
Goal = 100
Result = 83
```

aunque temporalmente:

```text
Compliance = NULL
Weighted Score = NULL
Traffic Light = NULL
```

---

## 2. Matriz de validaciones

Necesitamos definir formalmente algo como:

| Validación                  | Severity | Bloquea Save | Bloquea Submit | Bloquea Validate | Excepcionable |
| --------------------------- | -------- | ------------ | -------------- | ---------------- | ------------- |
| Resultado faltante          | Warning  | No           | quizá          | quizá            | Sí            |
| Texto donde esperaba número | Error    | Sí/fila      | Sí             | Sí               | No            |
| KPI desconocido Excel       | Error    | Import       | Sí             | Sí               | No            |
| Valor atípico               | Warning  | No           | No             | quizá            | Sí            |
| Template de otro período    | Critical | Import       | Sí             | Sí               | No            |

Esto sí lo debemos diseñar pronto.

---

## 3. Concurrencia

Codex tiene razón aquí.

Ejemplo:

```text
Ana abre KPI-050 = 80
Carlos abre KPI-050 = 80

Ana guarda 85
Carlos guarda 90
```

No podemos permitir que el segundo sobrescriba silenciosamente al primero.

Yo usaría **optimistic locking**:

```text
version = 3
```

Al guardar:

```text
UPDATE ...
WHERE id = ?
AND version = 3
```

Si ya pasó a versión 4:

```text
409 Conflict
```

UI:

> This result was modified by another user. Refresh before overwriting it.

Muy recomendable.

---

# Sobre `Save Draft`: también podemos resolverlo ya

No guardaría cada tecla.

Tampoco esperaría a que el usuario complete todo.

Usaría:

```text
[ Save Changes ]
```

y cada clic crea un:

```text
result_entry_batch
```

con solamente las filas modificadas.

Ejemplo:

```text
Manual Batch #15

KPI-050  80 → 85
KPI-071  NULL → 25
KPI-083  NULL → 0
```

Todo en una transacción.

Eso aprovecha perfectamente las tablas que ya tenemos.

---

# Excel está bastante más definido de lo que Codex cree

No está cerrado al 100%, pero ya sabemos bastante.

Yo partiría de:

```text
Config Code
KPI Code
KPI Name
Scorecard
Goal
Measurement Unit
Data Source
Result
Comment
```

Las primeras columnas son informativas/read-only.

El usuario principalmente llena:

```text
Result
Comment
```

Y metadata oculta:

```text
templateVersion
monitoringPeriodId
poolId
periodKey
generatedAt
```

Además:

```text
blank Result
→ Pending
→ NO error estructural
```

y un valor existente diferente:

```text
Current = 80
Excel = 90

→ Conflict
→ NO overwrite silencioso
```

Eso ya nos permite construir una V1 perfectamente razonable.

---

# Permisos: tampoco partimos de cero

Ya tenemos conceptualmente permisos como:

```text
MONITORING_VIEW
MONITORING_ENTER_RESULTS
MONITORING_VALIDATE_RESULTS
MONITORING_CLOSE_PERIOD
MONITORING_CLOSE_WITH_EXCEPTIONS
```

Lo que sigue abierto es el **scope**:

> “Tiene `ENTER_RESULTS`, ¿pero sobre qué compañía/departamento/Scorecard?”

Eso sí se resolverá con Access/Scope.

Pero para Result Entry podemos implementar desde ya los permisos de acción y conectar el scope después.

---

# NATS / eventos: no necesitamos cerrarlo ahorita

Codex tiene razón en que faltan payloads definitivos, pero **no permitiría que eso nos detenga**.

Para el primer vertical slice necesitamos:

```text
React
 ↓
Express
 ↓
Prisma
 ↓
MySQL
```

y nada más.

Cuando lleguemos a las transiciones importantes:

```text
scorecard.composition.finalized.v1
monitoring.period.submitted.v1
monitoring.period.validated.v1
monitoring.period.closed.v1
```

definimos Outbox + payloads.

---

# Yo le respondería a Codex con esta priorización

### BLOQUEA RESULT ENTRY AHORA

Solo necesitamos resolver:

1. Monitoring Period.
2. Expected Results.
3. Manual partial save.
4. Current Result.
5. Result revisions.
6. External IDs/FKs.
7. DRAFT.
8. Concurrencia básica.
9. API contract React ↔ Monitoring.

### SIGUIENTE SLICE

Después:

10. Excel template.
11. Upload/Preview/Confirm.
12. Manual + Excel conflicts.
13. Validation runs/issues.

### DESPUÉS

14. Submit.
15. Return for Correction.
16. Validate.
17. Close.

### NO BLOQUEA AHORITA

18. Scoring completo.
19. RAG/clasificación.
20. Reopen Period.
21. Reports.
22. Eventos NATS definitivos.

---

## Y hay una frase de Codex con la que estoy casi completamente de acuerdo

Dice:

> “Lo inseguro no es qué pantallas hacer, sino convertirlas en un workflow transaccional inequívoco.”

Exactamente.

Pero yo cambiaría su última recomendación de:

> “Antes de construir backend, fijar estados + cálculo + validaciones + Excel.”

a:

> **Antes de construir TODO el backend**, sí.

Pero **antes de construir Result Entry**, no necesitamos resolver todo eso.

Ya tenemos suficiente información para empezar hoy mismo con:

```text
Monitoring Period
↓
Expected Results
↓
Manual Entry
↓
Partial Save
↓
MySQL
↓
Refresh
↓
datos siguen ahí
```

Eso sería ahora mismo el paso correcto. No hace falta esperar a terminar la pelea matemática con `Goal = 0`, RAG y Linked Scorecards para poder guardar `KPI-050 Result = 83` en MySQL 😂.




parte 2: 

Sí. Esas dudas de Codex son buenas; de hecho, antes de empezar a programar Result Entry conviene cerrar estas 13 porque afectan directamente el modelo transaccional.

Hay dos correcciones importantes respecto a lo que Codex supone:

No permitimos que dos Scorecards del mismo Pool + Input Period seleccionen directamente la misma KPI Configuration. Por tanto, no necesitamos varios consumers para un mismo Expected Result.
Yo haría un pequeño ajuste al SQL antes de empezar: permitir result_value = NULL, agregar version para optimistic locking y mejorar las revisiones con valor anterior/nuevo. Esto hace mucho más limpio Pending, comentarios sin resultado y borrar un valor para volver a Pending.


RESPUESTAS / DECISIONES — MONITORING RESULT ENTRY VERTICAL SLICE

Estas decisiones aplican únicamente al primer vertical slice:

Monitoring Period DRAFT
→ Expected Results
→ Manual Entry
→ Partial Save
→ Refresh
→ datos persistidos

No implementar todavía Excel completo, Scoring Engine, Submit,
Validation avanzada, Close Period, NATS ni Reports.

==================================================
1. ¿QUIÉN CREA EL MONITORING PERIOD?
==================================================

Para la PRIMERA ENTREGA no vamos a depender todavía de NATS.

Usar un trigger explícito/controlado desde Monitoring para materializar
el Monitoring Period.

La operación debe reutilizar datos REALES de Pool y Scorecards mediante
sus contratos REST actuales.

Conceptualmente:

Pool + Input Period
        ↓
verificar readiness
        ↓
leer Scorecards/composiciones FINALIZED
        ↓
crear Monitoring Period
        ↓
crear snapshots
        ↓
crear Expected Results

No hardcodear August 2026 dentro de lógica productiva.

Se pueden usar fixtures solamente en tests.

Más adelante el mismo application service de materialización podrá
ser llamado automáticamente desde eventos NATS/Outbox.

IMPORTANTE:
No inventar nombres de endpoints si la convención existente sugiere otros.
Inspeccionar primero los servicios.

==================================================
2. ¿CUÁNDO SE MATERIALIZA OFICIALMENTE?
==================================================

Sí.

Para el MVP, Monitoring solamente materializa el período cuando todas
las composiciones de Scorecards aplicables al:

Pool + exact Input Period

están FINALIZED.

Usar el workflow/contrato real del Scorecard Service para determinar
los Scorecards aplicables.

Ejemplo:

OPS-04-2026
August 2026

SC-A → FINALIZED
SC-B → FINALIZED
SC-C → PREPARING

Monitoring:
NOT READY

Cuando:

SC-C → FINALIZED

Monitoring:
READY TO MATERIALIZE

IMPORTANTE:

La materialización crea un snapshot INMUTABLE del conjunto de Scorecards
y Expected Results.

Una vez materializado Monitoring para ese Pool + Input Period,
no deben aparecer silenciosamente nuevos Expected Results.

Para el primer slice el trigger será explícito/controlado.
La automatización/locking cross-service se resolverá después.

==================================================
3. IDENTIDAD DEL INPUT PERIOD
==================================================

Usar un ID ESTABLE perteneciente al KPI Pool Service.

Monitoring debe guardar como External ID:

pool_id
pool_input_period_id

y además snapshots útiles:

period_key = 2026-08
period_label = August 2026
period_start
period_end

NO usar solamente:

"August 2026"
fechas
periodKey

como identidad entre microservicios.

El ID estable del Pool Service es la identidad externa principal.

Inspeccionar el contrato actual del Pool Service para usar el nombre
real del campo.

Si el Pool Service todavía no expone un ID estable para el Input Period,
corregir ese contrato antes de inventar una identidad en Monitoring.

==================================================
4. ¿VARIOS SCORECARDS PUEDEN CONSUMIR EL MISMO KPI?
==================================================

NO para selección directa.

Ya existe esta regla de negocio:

Dentro del mismo:

Pool + Input Period

una KPI Configuration puede ser seleccionada directamente por UN SOLO
Scorecard.

Ejemplo válido:

KPC-050-01
→ SC-A

No permitido:

KPC-050-01
→ SC-A
→ SC-B

Por tanto:

un monitoring_period_input
→ un Scorecard originador directo.

No necesitamos monitoring_period_input_consumers para este MVP.

Linked Scorecards funcionan diferente.

Ejemplo:

SC-A
├── KPI-01
├── KPI-02
└── Linked SC-B

SC-B
├── KPI-03
└── KPI-04

Monitoring NO copia KPI-03/KPI-04 dentro de SC-A.

SC-B calcula posteriormente su Score y SC-A consume el resultado
del Linked Scorecard según su Weight.

No duplicar Expected Results.

==================================================
5. IDENTIDAD ÚNICA DEL EXPECTED RESULT
==================================================

No usar kpiPoolKpiId como identidad principal.

La identidad de negocio recomendada es:

UNIQUE:
monitoring_period_id
+
kpi_configuration_id

porque dentro del mismo Pool + Input Period esa Configuration solamente
puede ser seleccionada directamente por un Scorecard.

Guardar también como provenance External IDs:

kpi_configuration_revision_id
pool_composition_item_id
scorecard_kpi_assignment_id

según los IDs reales expuestos por los servicios.

La revision_id indica QUÉ revisión exacta quedó congelada.

La configuration_id identifica QUÉ KPI Configuration representa
el Expected Result.

Ejemplo:

Monitoring August
+
KPC-050-01

= un único Expected Result.

==================================================
6. SNAPSHOTS: ¿REALES O SEED?
==================================================

Usar datos REALES mediante REST desde:

Pool Service
Scorecard Service
KPI Management Service

si los contratos actuales ya permiten obtenerlos.

NO crear lógica productiva específica:

if August 2026 ...
hardcoded IDs...
hardcoded KPIs...

Para tests sí se pueden usar fixtures/adapters mocks.

Si falta un contrato pequeño, implementarlo o extenderlo de forma
acotada.

Objetivo:
que el primer Monitoring Period pueda materializarse usando datos
reales existentes en los otros servicios.

==================================================
7. KPI RESULT REVISION
==================================================

Modificar el diseño para guardar explícitamente BEFORE + AFTER.

Ejemplo primera captura:

previous_result_value = NULL
new_result_value      = 80

Cambio:

80 → 85

guardar:

previous_result_value = 80
new_result_value      = 85

Si cambia comentario:

previous_comment
new_comment

Agregar/conservar también:

revision_no
change_type
entry_source
changed_by_user_id
changed_at

Esto facilita muchísimo auditoría.

No depender únicamente de comparar la revisión N contra N-1.

==================================================
8. OPTIMISTIC LOCKING
==================================================

Agregar un campo explícito:

version INT NOT NULL DEFAULT 1

en kpi_results.

NO reutilizar revision_no como concurrency token.

Son conceptos distintos:

revision_no
= historial/auditoría

version
= concurrencia del registro vigente

Ejemplo:

Frontend lee:

result = 80
version = 3

al guardar:

UPDATE kpi_results
SET
  result_value = 85,
  version = 4
WHERE id = ?
AND version = 3

Si affectedRows = 0:

HTTP 409 Conflict

El resultado fue modificado por otro usuario.

==================================================
9. COMPLIANCE / SCORE / TRAFFIC LIGHT
==================================================

Confirmado:

durante esta primera etapa pueden ser NULL.

Modificar el SQL si actualmente están NOT NULL.

Campos como:

raw_achievement_percent
compliance_percent
weighted_score_points
traffic_light...

deben aceptar NULL durante DRAFT.

Ejemplo perfectamente válido ahora:

Goal = 100
Result = 83

Compliance = NULL
Weighted Score = NULL
Traffic Light = NULL

El Scoring Engine vendrá después.

NO bloquear Result Entry porque scoring todavía no esté implementado.

==================================================
10. ¿COMENTARIO SIN RESULT?
==================================================

Sí, permitámoslo.

Puede ser útil:

Result = NULL
Comment = "Pending confirmation from Accounting"

El Expected Result continúa:

PENDING

pero conserva el comentario.

Por tanto ajustar kpi_results para permitir:

result_value NULL

La semántica será:

result_value IS NULL
→ PENDING

result_value IS NOT NULL
→ ENTERED

IMPORTANTE:

0 NO es Pending.

Result = 0
→ ENTERED

Esto permite diferenciar correctamente:

NULL = todavía no existe valor
0 = resultado real cero

No es necesario precrear kpi_results para todos los Expected Results.
Puede crearse al primer cambio de valor/comentario.

==================================================
11. ¿SE PUEDE BORRAR UN RESULTADO?
==================================================

Sí, únicamente mientras Monitoring Period esté DRAFT.

Ejemplo:

Result = 85
↓
usuario limpia el campo
↓
Result = NULL
↓
ENTERED → PENDING

Debe quedar auditado:

previous_result_value = 85
new_result_value = NULL

No perder historial.

El Current Result queda con:

result_value = NULL
status = PENDING

y version incrementada.

Una vez SUBMITTED no se puede limpiar/modificar hasta Return for Correction.

==================================================
12. SAVE CHANGES Y CONFLICTOS
==================================================

Para el primer slice:

Save Changes debe ser ATÓMICO.

Ejemplo:

Usuario modifica 5 filas.

4 no tienen conflicto.
1 tiene version conflict.

Resultado:

ROLLBACK de las 5.

HTTP 409

Devolver información suficiente para identificar qué fila(s)
tuvieron conflicto.

No guardar silenciosamente 4/5.

Razón:

cada Save Changes genera un result_entry_batch auditable.

Queremos que:

Batch committed
= todas sus rows aplicadas correctamente.

Esto simplifica:
- transacciones;
- auditoría;
- retry;
- frontend;
- tests.

El frontend debe conservar los cambios locales del usuario,
mostrar el conflicto y permitir refrescar/reconciliar.

Una política de partial-success puede evaluarse después,
pero NO para el primer slice.

==================================================
13. ACTOR / USER ID
==================================================

Primero inspeccionar el mecanismo temporal de identidad que ya utilizan
los otros microservicios.

Reutilizar ese patrón.

Si Access/Auth todavía no está conectado end-to-end, permitir en DEV
un actor técnico/controlado.

Ejemplo conceptual:

DEV_ACTOR_USER_ID

o el middleware temporal existente.

NO hardcodear:

user_id = 1

dentro de services/repositories.

Todos estos IDs siguen siendo:

External IDs hacia Access/Identity.

NO physical FK.

Debe ser sencillo reemplazar posteriormente el actor temporal por el
userId real proveniente del JWT.

==================================================
AJUSTES DE DB ANTES DEL SLICE
==================================================

Antes de implementar Result Entry revisar/ajustar el SQL/Prisma para:

1. kpi_results.result_value
   → NULLABLE

2. campos de scoring
   → NULLABLE

3. agregar:
   kpi_results.version

4. kpi_result_revisions
   → guardar previous/new value y comment

5. UNIQUE:
   monitoring_period_id + kpi_configuration_id
   en Expected Results

6. FK físicas:
   solamente dentro de exa_monitoring

7. IDs de:
   Pool
   Input Period
   Pool Composition
   Scorecard
   Scorecard Composition
   KPI Configuration
   KPI Configuration Revision
   User
   etc.

   → External IDs, indexados, SIN FK física.

==================================================
PRIMER ACCEPTANCE TEST
==================================================

Queremos lograr exactamente esto:

1. Materializar August 2026 usando datos reales.

2. Crear:

Monitoring Period
DRAFT

3. Generar, ejemplo:

10 Expected Results.

4. Abrir Result Entry.

UI:

Expected       10
Entered         0
Pending        10

5. Ingresar manualmente:

KPI-A = 80
KPI-B = 0
KPI-C = 95

KPI-D:
Result = NULL
Comment = "Pending confirmation"

6. Save Changes.

Debe crear:

1 result_entry_batch
N batch_rows
current kpi_results
kpi_result_revisions

todo dentro de la misma transacción.

7. UI:

Expected       10
Entered         3
Pending          7

El KPI cuyo Result = 0 cuenta como ENTERED.

El KPI con comentario pero Result = NULL sigue PENDING.

8. Recargar navegador.

Los datos deben permanecer.

9. Modificar:

KPI-A
80 → 85

Debe:

- actualizar current result;
- incrementar version;
- crear revision 80 → 85.

10. Probar conflicto concurrente.

Si version enviada != current version:

409 Conflict
sin partial save.

==================================================
FUERA DE ALCANCE
==================================================

NO implementar todavía:

- Excel completo;
- Scoring Engine;
- RAG;
- Traffic Light calculation;
- Weighted Score;
- validation avanzada;
- Submit;
- Return for Correction UI;
- Close Period;
- reopen;
- Reports;
- NATS automation.

Primero completar esta vertical slice y reportar:

- archivos modificados;
- migrations/Prisma;
- endpoints implementados;
- contrato frontend/backend;
- tests;
- typecheck/build;
- resultado del acceptance test.


La decisión más importante de esas 13

Para mí es la #2 + #1 juntas:

Monitoring no inventa inputs mientras las composiciones siguen cambiando.

Primero:

Pool August
      ↓
Scorecards aplicables
      ↓
todos FINALIZED
      ↓
MATERIALIZE MONITORING

Y ahí tomamos una fotografía:

August 2026

Scorecards:
A
B
C

Expected Results:
KPC-001
KPC-007
KPC-014
...

Desde ese momento esos Expected Results ya no deberían andar apareciendo/desapareciendo mientras alguien está llenando resultados.

Y para no meternos todavía con NATS, el primer slice puede materializarlo mediante una acción/endpoint controlado, pero usando REST y datos reales. Después simplemente hacemos que un evento invoque ese mismo caso de uso.

Eso nos permite empezar a programar sin hipotecar la arquitectura futura. ☠️🔥


parte 3

Sí: **Codex hizo exactamente lo correcto al detenerse**. No encontró un “bug pequeño”; encontró **dos contratos que todavía no existen y que Monitoring necesita para no inventar información**. En concreto, Scorecards no puede distinguir hoy entre “este Scorecard aplica a August pero todavía no empezó” y “este Scorecard simplemente no aplica a August”; además, el contrato actual no entrega toda la composición necesaria para materializar Monitoring. KPI Management, por su parte, devuelve la revisión más reciente, que no necesariamente es la revisión efectiva del período histórico.  

Y creo que ya podemos resolverle esas dudas sin volver a abrir veinte discusiones 😂.

## 1. Lo más importante: ¿qué significa “Scorecard aplicable a August 2026”?

Aquí está el hueco verdadero.

No quiero que Monitoring haga:

```text
"Este Scorecard usa OPS-04-2026,
seguramente aplica a August."
```

Tampoco quiero que la existencia de una `ScorecardPeriodComposition` sea lo que determine aplicabilidad, porque entonces:

```text
No existe composition
```

puede significar dos cosas:

```text
A) Sí debía existir, pero aún no la prepararon.
B) Ese Scorecard no participa en ese período.
```

La solución que recomiendo es que **Scorecards sea dueño explícitamente de su ventana de aplicabilidad dentro de los Input Periods del Pool**.

Pero ojo: esto **NO devuelve Duration/Frequency al Scorecard**.

Seguimos con:

```text
Pool
Aug 2026
Sep 2026
Oct 2026
...
Mar 2027
```

El Scorecard solo dice:

```text
"Yo participo desde este Input Period del Pool
hasta este Input Period del Pool."
```

Conceptualmente:

```text
SC-OPS-01

Pool:
OPS-04-2026

Applies from:
August 2026
(poolInputPeriodId = 101)

Applies through:
March 2027
(poolInputPeriodId = 108)
```

Internamente podrían llamarse, según el estilo real del proyecto:

```text
applicable_from_pool_input_period_id
applicable_to_pool_input_period_id
```

Ambos son **External IDs hacia Pool**, no FKs físicas.

---

# 2. ¿El usuario tiene que seleccionar eso?

No necesariamente.

De hecho, para no volver a complicar Create Scorecard, yo lo **derivaría automáticamente**.

Si el Pool todavía comienza:

```text
Pool:
Aug 2026 → Mar 2027
```

y creas el Scorecard antes de iniciar:

```text
Scorecard applies:
Aug 2026 → Mar 2027
```

Si en el futuro permitimos crear un Scorecard cuando ya vamos por October:

```text
Aug CLOSED
Sep CLOSED
Oct current
Nov future
```

podemos establecer según la regla que definamos:

```text
applies from:
next eligible Pool Input Period
```

Por ejemplo November.

Entonces jamás aplicaría retroactivamente a August.

Eso mantiene la UI sencilla pero el backend tiene una semántica formal.

---

# 3. Entonces `NOT_STARTED` ya tiene significado real

Una vez sabemos que SC-A **sí aplica** a August:

```text
Applicable = YES
Composition row = none
```

Scorecards puede responder:

```text
NOT_STARTED
```

Si existe:

```text
composition.status = PREPARING
```

→

```text
PREPARING
```

Si existe:

```text
composition.status = FINALIZED
```

→

```text
FINALIZED
```

Pero si August está fuera de su applicability window:

```text
Applicable = NO
```

ni siquiera forma parte de la lista oficial de Scorecards que Monitoring debe esperar.

🔥 Ahí desaparece completamente la ambigüedad que encontró Codex.

---

# 4. El nuevo contrato de Scorecards

Estoy de acuerdo con Codex en que **Monitoring no debería hacer 25 consultas individuales**:

```text
GET scorecard A
GET composition A
GET KPIs A
GET links A
GET scorecard B
GET composition B
...
```

Eso sería una especie de N+1 entre microservicios 💀.

Scorecards debería exponer una **proyección interna específica para materialización**.

No le impondría todavía el nombre exacto del endpoint. Que Codex siga la convención del proyecto.

Conceptualmente Monitoring pregunta:

```text
Pool:
OPS-04-2026

Pool Input Period:
August 2026 / poolInputPeriodId=...
```

y Scorecards responde:

```text
readiness:
NOT_READY | READY

applicableScorecardCount: 2
finalizedScorecardCount: 1

scorecards:
[
  SC-A FINALIZED,
  SC-B PREPARING
]
```

Si:

```text
SC-A FINALIZED
SC-B PREPARING
```

respuesta:

```text
READY = false
```

Monitoring NO materializa.

Cuando:

```text
SC-A FINALIZED
SC-B FINALIZED
```

respuesta:

```text
READY = true
```

y esa misma proyección entrega la información para snapshot.

---

# 5. Cuando esté READY, Scorecards debe entregar todo en una sola proyección

Por cada Scorecard:

```text
scorecardId
scorecardCode
scorecardName

poolId
poolInputPeriodId

scorecardPeriodCompositionId
compositionStatus = FINALIZED
```

Y por KPI directo:

```text
scorecardKpiAssignmentId

kpiConfigurationId

poolMembershipExternalId /
poolCompositionItemId
(según IDs reales existentes)

weightPercent
```

Y Linked Scorecards:

```text
linkedScorecardId
linkedScorecardCompositionId
linkAssignmentId
weightPercent
```

No para generar Expected Results duplicados, sino para preservar la estructura que necesitaremos cuando llegue el Scoring Engine.

---

# 6. Una regla importante si no hay Scorecards

Yo también la cerraría ahora.

Supongamos:

```text
Pool August
Applicable Scorecards = 0
```

No materializaría: 

```text
Monitoring Period
Expected = 0
```

como si todo estuviera perfecto.

Respondería algo conceptualmente como:

```text
NOT_READY
reason = NO_APPLICABLE_SCORECARDS
```

porque Monitoring sin nada que monitorizar no tiene sentido.

---

# 7. El hueco de KPI Management también es real

Codex detectó algo muy importante:

Ahora mismo:

```text
batch lookup
→ latest revision
```

pero Monitoring necesita:

```text
effective revision FOR AUGUST 2026
```

No son lo mismo. 

Ejemplo:

```text
Revision 1
Jan 01 → Aug 31
Goal = 15%

Revision 2
Sep 01 →
Goal = 18%
```

Estamos materializando:

```text
August 2026
```

Si haces `latest`:

```text
18% ❌
```

Monitoring debe congelar:

```text
15% ✅
```

---

# 8. ¿Cómo resolver la revisión efectiva?

Crearía el contrato batch que propone Codex.

Conceptualmente:

```text
Configuration IDs:
[
  KPC-050-01,
  KPC-051-01,
  KPC-060-02
]

Period:
start = 2026-08-01
end   = 2026-08-31
```

KPI Management responde con **exactamente una revisión efectiva** por Configuration.

Idealmente la revisión debe cubrir el período correspondiente:

```text
effectiveFrom <= periodStart

AND

effectiveTo IS NULL
OR effectiveTo >= periodEnd
```

Como nuestra política es que las revisiones cambien desde períodos siguientes, normalmente no deberíamos tener una revisión que cambie a mitad de August.

Si encuentra:

```text
0 revisiones efectivas
```

→ ERROR.

Si encuentra:

```text
2 revisiones solapadas
```

→ ERROR.

Nunca:

```text
"escojo la última y ya"
```

---

# 9. Qué debe devolver KPI Management

Para este slice sí necesitamos:

```text
kpiConfigurationId
kpiConfigurationRevisionId
revisionNumber

configCode
kpiCode
kpiName

target / goal

effectiveFrom
effectiveTo

evaluationType
measurementUnit
dataSource

thresholds
```

Porque esos sí existen en el dominio y queremos congelarlos históricamente.

---

# 10. Pero NO agregaría todavía `Scoring Method` a KPI Management

Este es otro punto donde Codex hizo bien en preguntar.

Encontró que Monitoring exige:

```text
scoring_method_code_snapshot NOT NULL
calculation_rule_version
is_sensitive
objective...
```

pero esos conceptos ni siquiera existen todavía realmente en KPI Management. 

No vamos a inventarlos solamente para satisfacer el SQL.

Para este slice:

```text
scoring_method_code_snapshot
→ NULLABLE
```

```text
calculation_rule_version
→ NULLABLE
```

`is_sensitive`

→ nullable o fuera del slice si no existe.

`objective`

→ tampoco debe inventarse como campo de Configuration si actualmente pertenece a Definition.

Pero:

```text
kpi_configuration_revision_id
```

✅ debe seguir siendo obligatorio.

Y:

```text
evaluation_type
```

✅ también lo conservaría porque ya existe en KPI Management; solo hay que exponerlo.

Es decir:

> Lo que existe pero no está expuesto → ampliar contrato.

> Lo que todavía ni siquiera existe en dominio → nullable/deferred.

---

# 11. Esto además nos viene perfecto para la futura clasificación

Cuando lleguemos al demonio matemático 😂:

```text
Goal + Result
→ Evaluation
→ Scoring Method
→ Compliance
```

ahí agregamos formalmente:

```text
scoring_method
calculation_rule_version
```

a KPI Management.

Pero **no necesitamos resolverlo para guardar Result = 85**.

---

# 12. SQL: sí, arreglar inmediatamente

Codex encontró esto:

```sql
CREATE DATABASE `exa_monitoring-service`;
USE `exa_monitoring`;
```

Eso está mal y debe quedar simplemente:

```sql
CREATE DATABASE IF NOT EXISTS `exa_monitoring`;
USE `exa_monitoring`;
```

El SQL MySQL 8 que habíamos preparado ya usa `exa_monitoring` de forma consistente y además documenta explícitamente que las FKs físicas se mantienen solo dentro de Monitoring. 

Así que Codex debe corregir el **archivo canónico dentro del repo**, no crear otra BD llamada:

```text
exa_monitoring-service
```

---

# Qué le diría ahora a Codex

Yo le daría esta decisión:

```text
APROBADAS LAS DOS EXTENSIONES CONTRACTUALES PREVIAS A MONITORING.

1. SCORECARD APPLICABILITY

Scorecards debe ser source of truth de qué Scorecards son aplicables
a un Pool Input Period exacto.

No inferir applicability desde:
- existencia de composition;
- lifecycle solamente;
- "usa este Pool".

Implementar una applicability window basada EXCLUSIVAMENTE en
Input Periods generados por Pool.

Conceptualmente:

applicable_from_pool_input_period_id
applicable_to_pool_input_period_id

Son External IDs hacia Pool.
NO FK física cross-service.
NO Prisma relation cross-service.

Esto NO crea calendario/frequency propio del Scorecard.
Scorecard sigue heredando el schedule del Pool.

Para un período objetivo:

outside applicability window
→ Scorecard no aparece como applicable.

inside applicability window + no composition
→ NOT_STARTED.

inside + PREPARING composition
→ PREPARING.

inside + FINALIZED composition
→ FINALIZED.

Si el modelo actual permite implementar esta semántica con una
estructura equivalente más consistente, reutilizar el diseño existente
y explicar la decisión; no duplicar tablas innecesariamente.

Para Scorecards nuevos, la applicability window debe derivarse de
Input Periods reales del Pool y nunca incluir períodos históricos
a los que el Scorecard no debía aplicar.

No agregar Duration/Frequency independiente al Scorecard.

==================================================

2. SCORECARDS INTERNAL MATERIALIZATION PROJECTION

Agregar/extender un contrato interno period-scoped basado en:

poolId
+
poolInputPeriodId

Debe ser la fuente oficial para Monitoring.

Debe devolver:

readiness
applicableScorecardCount
finalizedScorecardCount

y todos los applicable Scorecards incluso:

NOT_STARTED
PREPARING
FINALIZED.

Monitoring podrá materializar solamente si:

applicableScorecardCount > 0
AND
todos = FINALIZED.

Cuando READY, el mismo contrato debe entregar la proyección necesaria:

Scorecard:
- scorecardId
- code/name
- scorecardPeriodCompositionId
- composition status

Direct KPI assignments:
- scorecardKpiAssignmentId
- kpiConfigurationId
- Pool provenance ID existente
- weight

Linked Scorecards:
- relation/link ID
- linkedScorecardId
- linked period composition ID
- weight
- status requerido

Usar nombres/IDs REALES del schema existente.
No inventar nombres alternos si ya existe provenance equivalente.

No N+1 desde Monitoring.

==================================================

3. KPI MANAGEMENT EFFECTIVE SNAPSHOT BATCH

Agregar un contrato interno batch que reciba:

configurationIds[]
periodStart
periodEnd

Debe devolver exactamente la revisión efectiva para ese Input Period.

NO usar latest revision.

Debe fallar si:
- no existe revisión efectiva;
- existe solapamiento/ambigüedad.

Snapshot mínimo:

- kpiConfigurationId
- kpiConfigurationRevisionId
- revisionNumber
- effectiveFrom/effectiveTo
- configCode
- KPI code/name
- target/goal
- evaluation type ID/code
- measurement unit ID/code/name/symbol
- data source ID/code/name
- thresholds con boundaries/inclusividad

==================================================

4. CAMPOS AÚN NO EXISTENTES

NO implementar todavía conceptos ficticios solamente para satisfacer
Monitoring.

Para este slice:

scoring_method_code_snapshot
→ nullable/deferred

calculation_rule_version
→ nullable/deferred

is_sensitive
→ nullable/deferred si no existe contrato real

objective
→ no duplicar incorrectamente si pertenece a KPI Definition

Mantener obligatorios cuando ya existen realmente:

kpi_configuration_revision_id
evaluation_type

==================================================

5. SQL

Corregir el bootstrap canónico a:

CREATE DATABASE IF NOT EXISTS exa_monitoring;
USE exa_monitoring;

Nunca crear exa_monitoring-service.

Mantener:
same service → physical FK
cross service → External ID only.

==================================================

ORDEN

Primero implementar y probar solamente:

A. Scorecard applicability
B. Scorecard readiness/materialization projection
C. KPI Management effective revision batch contract

Ejecutar tests de Scorecards y KPI Management.

DETENERSE y reportar contratos finales/respuestas de ejemplo.

NO empezar todavía exa-monitoring-service hasta verificar estos
prerrequisitos.
```

Ese último detalle me parece importante: **yo todavía no le diría que construya Monitoring inmediatamente después de modificar esto en la misma corrida**.

Primero que haga estos dos contratos, corra tests y nos enseñe:

```text
Scorecards materialization projection
```

y:

```text
KPI Management effective snapshot batch
```

con ejemplos reales.

Los revisamos y después sí le decimos:

> “Ahora sí, construye `Monitoring Period → Expected Results → Result Entry`.”

Porque Codex acaba de encontrar exactamente el tipo de hueco arquitectónico que queríamos descubrir **antes** de llenar `exa_monitoring` de External IDs que después no sabemos de dónde sacar. 😂

Y no es que retrocedimos: al contrario, estamos definiendo por fin el **contrato formal Scorecards → Monitoring** y **KPI Management → Monitoring**, que es lo que convierte a los microservicios en algo real y no simplemente “seis carpetas Express separadas”.



parte 4 

CORRECCIÓN IMPORTANTE — SCORECARD APPLICABILITY

Revisando el modelo funcional acordado, NO vamos a introducir
applicability_from / applicability_to para Scorecards.

La regla original se mantiene:

UN SCORECARD HEREDA COMPLETAMENTE LA VIDA ÚTIL Y EL SCHEDULE DEL KPI POOL.

Ejemplo:

Pool:
August 2026 → March 2027
Monthly

Scorecard asociado a ese Pool:

Inherited Schedule:
August 2026 → March 2027
Monthly

Scorecard NO posee:

- valid_from propio;
- valid_to propio;
- duration propia;
- frequency propia;
- applicable_from;
- applicable_to.

==================================================

APPLICABILITY POR INPUT PERIOD

Si:

Scorecard.poolId = target Pool

y:

poolInputPeriod.poolId = target Pool

entonces el Scorecard corresponde a ese Input Period.

No necesitamos una segunda applicability window.

Para cada Input Period:

no ScorecardPeriodComposition
→ NOT_STARTED

composition PREPARING
→ PREPARING

composition FINALIZED
→ FINALIZED

Por tanto la lista oficial de Scorecards que Monitoring debe esperar
para un Pool + Input Period es el conjunto de Scorecards operativos
asociados a ese Pool durante su vida útil completa.

==================================================

POOL / SCORECARD STRUCTURAL RULE

Para mantener este modelo simple durante el MVP:

los Scorecards que participarán en el Pool deben definirse antes de
que el Pool entre plenamente en operación.

Una vez el Pool esté ACTIVE / haya iniciado su workflow operativo,
NO agregar nuevos Scorecards estructurales a ese Pool.

No introducir todavía incorporación de Scorecards a mitad de la vida
del Pool.

Si el negocio requiere esa capacidad en el futuro, se diseñará como
una regla temporal explícita separada.

NO implementar applicability windows preventivamente.

==================================================

SCORECARD READINESS PROJECTION

El contrato interno period-scoped sigue siendo necesario.

Input:

poolId
poolInputPeriodId

Debe obtener todos los Scorecards correspondientes al Pool y devolver:

NOT_STARTED
PREPARING
FINALIZED

Ejemplo:

SC-A FINALIZED
SC-B FINALIZED
SC-C NOT_STARTED

readiness = NOT_READY

Solo cuando todos estén FINALIZED:

readiness = READY

y Monitoring podrá materializar el Input Period.

==================================================

IMPORTANTE

No inferir que:

composition inexistente = Scorecard no aplicable.

En nuestro modelo:

composition inexistente
= NOT_STARTED

porque el Scorecard hereda todos los Input Periods del Pool.

Eliminar de la propuesta:

applicable_from_pool_input_period_id
applicable_to_pool_input_period_id

No crear esos campos ni migraciones.



step 6-

6. Después: EXCEL

Aquí es donde discrepo más con el orden de Codex.

El siguiente slice funcional grande debería ser:

Excel Import

porque entonces podemos decir:

Result Entry ya está completo en sus dos mecanismos de captura.

El flujo:

Result Entry — August 2026

[ Manual Entry ]       [ Excel Import ]

y ambos modifican exactamente los mismos kpi_results.

7. Generación de Excel

Backend:

Monitoring Period
        ↓
Expected Results
        ↓
Generate .xlsx

La plantilla debería salir de los snapshots reales ya materializados.

Algo como:

Config Code	KPI Code	KPI Name	Goal	Unit	Data Source	Result	Comment

Las primeras columnas protegidas/read-only.

Usuario modifica:

Result
Comment

Y metadata interna:

templateVersion
monitoringPeriodId
poolInputPeriodId
periodKey
generatedAt
8. Excel Upload → Parse → Validate → Preview

Nada de:

Upload
↓
INSERT 💀

Debe ser:

Upload
↓
Parse
↓
Validate
↓
Preview

Ejemplo:

40 Expected Results

32 New Values
4 Blank / Pending
2 Existing Same Value
2 Existing Different Value
0 Invalid Rows
9. Confirm Import

Solo después:

Confirm Import

crea:

result_entry_batch
method = EXCEL

y aplica exactamente la misma filosofía que Manual.

Entonces podremos hacer el caso que tú querías desde el principio:

50 Expected

Excel
→ 43 Entered

Manual
→ completar 7

50 / 50

🔥 Ahí sí Result Entry está completo.

Después viene el Scoring Engine

Yo tampoco esperaría hasta casi el final como propone Codex.

Una vez Manual + Excel funcionan, ya tenemos:

Goal
Result
Evaluation Type
Threshold snapshot
Weight

Entonces podemos atacar:

Goal + Result
     ↓
Compliance %
     ↓
Traffic Light
     ↓
Weighted Score

incluyendo el infierno:

Greater
Lower
Goal = 0
Equal
Range

☠️

Esto nos permitirá que Result Preview deje de ser mock.

Después Validation

Aquí separaría dos niveles.

Basic Validation

Ya puede existir durante DRAFT:

Missing
Invalid number
Invalid format
Unknown input
etc.
Business Validation

Después del Scoring Engine:

Threshold warnings
Critical conditions
Outliers
Incomplete results
etc.

Y seguimos con la regla:

Validate
≠
Submit

Puedes validar cinco veces estando:

DRAFT
Después Review & Submit

Cuando el usuario esté satisfecho:

DRAFT
↓
Review
↓
Submit
↓
SUBMITTED

Ahí Manual y Excel quedan read-only.

Después Return for Correction

Desde:

SUBMITTED

el validador puede:

Return for Correction
        ↓
DRAFT

con justificación.

Y entonces vuelven a habilitarse:

Manual Entry
Excel Import

pero siguen modificando los mismos Result Inputs, no se crea otro Monitoring Period.

Después VALIDATED → CLOSED

Entonces:

SUBMITTED
↓
VALIDATED
↓
CLOSED

más:

Close with Exceptions

cuando terminemos su matriz exacta de permisos/warnings/excepciones.

Yo reordenaría el roadmap así
✅ 1. Materialization
✅ 2. Expected Results
✅ 3. Manual Entry
✅ 4. Partial Save
✅ 5. Revisions
✅ 6. Optimistic Locking

AHORA:
7. Navigation real
8. Reproducible fixtures
9. Integration/concurrency tests
10. Conflict UX
11. Frontend validation básica

SIGUIENTE SLICE:
12. Excel Template
13. Upload
14. Parse/Validate
15. Preview
16. Confirm Import
17. Manual + Excel coexistence

DESPUÉS:
18. Scoring Engine
19. Traffic Lights
20. Result Preview

WORKFLOW:
21. Draft Validation
22. Review & Submit
23. Return for Correction
24. Approve / Validate
25. Close Period
26. Close with Exceptions

INTEGRACIÓN:
27. Monitoring Overview real
28. Attached Scorecards real
29. Pool Input Schedule real
30. NATS / automatic materialization
31. Reports

Eso me parece más coherente con cómo hemos diseñado el módulo.

Y auth no me preocuparía demasiado todavía

Codex menciona:

TEMPORARY_ACTOR_USER_ID

Eso está bien por ahora, siempre que esté centralizado y sea reemplazable.

No detendría Excel ni Scoring esperando que exa-access esté terminado.

Lo importante es que no haya:

userId = 1

metido por todos lados.

Sobre SERIALIZABLE

También me gusta para este primer slice porque hace mucho más sencillo garantizar:

5 modified rows
→ todas
o
→ ninguna

Más adelante, si Monitoring tiene muchísima concurrencia y observamos contention/deadlocks, podemos revisar el isolation level.

Pero no optimizaría prematuramente algo que ya funciona y está probado.

En resumen

Codex puede considerar terminado el primer vertical slice.

Yo cerraría ahora estas 4 cosas:

navegación → fixture reproducible → tests de concurrencia → UX del 409

y después iría directo a Excel.

Porque nuestro milestone real debería ser:

Un usuario puede llenar los resultados de August 2026 manualmente, por Excel o combinando ambos; guardar parcialmente, salir, regresar y continuar.

Cuando tengamos eso, entonces sí nos ponemos el traje de exorcista para implementar el Scoring Engine 💀☠️.