                                                                                                   Monitoring
  ────────────────  ─────────────────  ─────────────────────  ──────────────────  ──────────────  ──────────────────────  ────────
   Entry method      Método por         Método persistido      Falta               P0              Monitoring/Frontend     Alto
                     batch/local UI     por Scorecard          exclusividad
  ────────────────  ─────────────────  ─────────────────────  ──────────────────  ──────────────  ──────────────────────  ────────
   Results           Current +          Igual                  Reutilizable        P0-integrar     Monitoring              Bajo
                     revisions
  ────────────────  ─────────────────  ─────────────────────  ──────────────────  ──────────────  ──────────────────────  ────────
   Versions          Una versión        results/workflow       Falta separación    P0              Monitoring              Alto
                     global             separados
  ────────────────  ─────────────────  ─────────────────────  ──────────────────  ──────────────  ──────────────────────  ────────
   Validation        Global,            Por Scorecard +        Scope incorrecto    P0              Monitoring              Alto
                     invalidación       versión
                     por estado
  ────────────────  ─────────────────  ─────────────────────  ──────────────────  ──────────────  ──────────────────────  ────────
   Scoring           Decimal y          GREATER/LOWER/ZERO     Ajustes de V1/      P0              Monitoring              Medio
                     snapshots                                 rounding
  ────────────────  ─────────────────  ─────────────────────  ──────────────────  ──────────────  ──────────────────────  ────────
   Submit/Return     Global             Por Scorecard          Scope incorrecto    P0              Monitoring              Alto
  ────────────────  ─────────────────  ─────────────────────  ──────────────────  ──────────────  ──────────────────────  ────────
   Validate          approve, global    Validate por           Scope/nombre        P0              Monitoring/UI           Medio
                                        Scorecard
  ────────────────  ─────────────────  ─────────────────────  ──────────────────  ──────────────  ──────────────────────  ────────
   Close             Una closure        Closure por            Falta nivel         P0              Monitoring              Alto
                     global             Scorecard +            intermedio
                                        agregado
  ────────────────  ─────────────────  ─────────────────────  ──────────────────  ──────────────  ──────────────────────  ────────
   Next period       Evento y gate      Igual                  Ajustar momento     P0              Monitoring/Pool         Medio
                     existentes                                del evento
  ────────────────  ─────────────────  ─────────────────────  ──────────────────  ──────────────  ──────────────────────  ────────
   Frontend          Pantalla real      Scorecard-oriented     Reintegración       P0              Frontend                Alto
                     pero monolítica    Manual flow
  ────────────────  ─────────────────  ─────────────────────  ──────────────────  ──────────────  ──────────────────────  ────────
   Excel             Ejecutable y       Fuera de Manual V1     Deshabilitar        P1              Monitoring/UI           Medio
                     mezclable
  ────────────────  ─────────────────  ─────────────────────  ──────────────────  ──────────────  ──────────────────────  ────────
   BY_SUBJECT        No vertical        Futuro por Target      No bloquear         P1              Varios                  Medio
                     actual                                    diseño
  ────────────────  ─────────────────  ─────────────────────  ──────────────────  ──────────────  ──────────────────────  ────────
   Auth/RBAC         Permisos mock      Real                   Diferido            P2              Frontend/Backend        Alto
  ────────────────  ─────────────────  ─────────────────────  ──────────────────  ──────────────  ──────────────────────  ────────
   Observabilidad    Parcial            Productiva             Diferido            P2              Varios                  Medio

  # K. Plan de implementación derivado

  ## Fase 1 — Aggregate y Manual persistence

  1. Promover MonitoringPeriodScorecard a agregado operativo.
  2. Agregar status, selectedEntryMethod, resultsVersion y workflowVersion.
  3. Seleccionar y persistir MANUAL.
  4. Hacer Save/Get Results por Scorecard Period.
  5. Conservar Results y revisions actuales.

  ## Fase 2 — Check Results y scoring

  6. Ejecutar Check Results por Scorecard.
  7. Restringir el vertical a GREATER, LOWER y ZERO.
  8. Aplicar rounding explícito a seis decimales.
  9. Calcular Completion, Weight Coverage, Partial Score.
  10. Implementar igualdad explícita basedOnResultsVersion.

  ## Fase 3 — Workflow

  11. Submit por Scorecard.
  12. Return for Correction preservando MANUAL y Results.
  13. Requerir un nuevo Check antes de resubmit.
  14. Validate empresarial por Scorecard.

  ## Fase 4 — Closure y progresión

  15. Closure Snapshot por Scorecard.
  16. Derivar cierre agregado de la cohorte.
  17. Emitir cierre del Pool una sola vez.
  18. Verificar el desbloqueo del siguiente Input Period.

  ## Fase 5 — UI y aceptación

  19. Adaptar Result Entry al Scorecard Period.
  20. Deshabilitar Excel.
  21. Integración MySQL/Docker.
  22. E2E Manual completo.

  # L. Primera tarea recomendada

  ## Task 1 — Alinear el agregado Monitoring Scorecard Period

  Esta debe ser la única primera implementación.

  ### Scope

  - Convertir MonitoringPeriodScorecard en propietario de:
      - status;
      - selectedEntryMethod;
      - resultsVersion;
      - workflowVersion.

  - Crear cada Scorecard Period como DRAFT/NULL method al materializar.
  - Exponer esos campos en la lectura del Result Entry.
  - Incorporar una operación para seleccionar MANUAL.
  - Rechazar cambio directo a EXCEL una vez seleccionado.
  - Mantener MonitoringPeriod como contenedor/cohorte.
  - No mover ni reescribir todavía el scoring o workflow completo.

  ### Archivos probables

  - backend/exa-monitoring-service/prisma/schema.prisma:135
  - backend/exa-monitoring-service/src/services/monitoring-period.service.ts:80
  - backend/exa-monitoring-service/src/services/result-entry.service.ts:106
  - backend/exa-monitoring-service/src/schemas/monitoring-period.schema.ts
  - backend/exa-monitoring-service/src/controllers/monitoring-period.controller.ts
  - backend/exa-monitoring-service/src/routes/monitoring-period.routes.ts
  - Tests de materialización y Result Entry.

  ### Acceptance criteria

  Materialize August
  → crea Scorecard A Period
  → status DRAFT
  → selectedEntryMethod NULL
  → resultsVersion inicial
  → workflowVersion inicial

  Select MANUAL
  → persiste MANUAL
  → refresh sigue mostrando MANUAL

  Intentar seleccionar EXCEL
  → rechazado
  → requiere Reset Draft futuro

  Scorecard A y Scorecard B
  → tienen estado/versiones/método independientes

  MonitoringPeriod
  → conserva la cohorte
  → todavía no se considera cerrado

  ### Tests

  - Materialización inicializa estado/versiones/método.
  - Dos Scorecards tienen agregados independientes.
  - Selección MANUAL persiste.
  - Repetir MANUAL es idempotente.
  - MANUAL → EXCEL sin Reset es rechazado.
  - Scorecard no perteneciente al Monitoring Period es rechazado.
  - Composición/snapshot congelado no se modifica.

  ### Non-goals

  - No scoring.
  - No Check Results.
  - No Submit/Return/Validate/Close.
  - No Excel.
  - No Reset Draft completo.
  - No frontend masivo.
  - No BY_SUBJECT.
  - No Linked Scorecards.
  - No Auth/RBAC.
  - No Reports.

  Ese es el punto correcto para detenernos. La próxima autorización debería ser literalmente: “Implementa Task 1 — Monitoring
  Scorecard Period aggregate.”

─ Worked for 3m 47s ──────────────────────────────────────────────────────────────────────────────────────────────────────────────


› entiende esto porfavor: Antes de seguir con Monitoring conviene dejar una frontera de responsabilidades casi contractual entre
  los servicios. Si no, terminamos metiendo lógica de clasificación en Monitoring, overrides en KPI Management, scoring en
  Scorecards y después nadie sabe quién manda ☠️.

  La separación que usaría sería esta:

  KPI MANAGEMENT
  "¿Qué es este KPI y cómo debe medirse?"
          ↓
  KPI POOL
  "¿En qué Pool/período aplica y hay algún ajuste local?"
          ↓
  SCORECARD
  "¿Cómo participa en este Scorecard, con qué peso y scope?"
          ↓
  FINALIZED
          ↓
  MONITORING
  "Ya me dieron todo congelado.
   Solo recibo resultados, valido, calculo y cierro."
          ↓
  REPORTS
  "Leo históricos cerrados y los analizo."
  1. Lo que pertenece EXCLUSIVAMENTE a KPI Management

  exa-kpi-management-service debería ser dueño de todo lo relacionado con la definición conceptual y técnica del KPI.

  Por ejemplo:

  KPI Definition
  KPI Configuration
  Result Semantics
  Evaluation Behavior
  Scoring Method
  Scoring Rule Config
  Measurement Unit
  Data Source
  Traffic Light definition
  Goal Mode
  BY_SUBJECT target definitions
  Global Configuration
  Autosuggest / Definition Analyzer

  KPI Management responde preguntas como:

  ¿Qué significa KPI-050?

  ¿Es GREATER o LOWER?

  ¿Qué representa el Result?

  ¿Su scoring es PROPORTIONAL?

  ¿Su meta global es 3700?

  ¿Es COUNT, RATIO, PERCENTAGE?

  ¿La configuración está completa/aprobada?

  Pero no debe saber cuánto Result puso Juan en August 2026.

  Eso ya es Monitoring.

  2. El Autosuggest pertenece a KPI Management

  Sí: aquí tiene muchísimo sentido algo parecido a Google.

  Mientras el usuario escribe:

  Aumentar ven...

  podríamos mostrar:

  Aumentar ventas
  Aumentar ventas de transporte
  Aumentar ventas de contenedores
  Aumentar ventas vs año anterior

  Pero yo separaría dos funcionalidades.

  A. Autocomplete de KPIs existentes

  Sirve principalmente para evitar duplicados.

  Usuario escribe:

  Aumentar ventas de transp...

  respuesta:

  Existing similar KPI Definitions

  KPI-014
  Aumentar ventas de transporte

  KPI-083
  Aumentar ventas de transporte terrestre

  KPI-102
  Ventas de transporte vs período anterior

  Como Google:

  Aumentar ventas...
                 transporte
                 transporte terrestre
                 contenedores
                 Grupo EXA

  Aquí usamos:

  normalización de texto;
  tokens;
  búsqueda parcial;
  similitud;
  posiblemente índices de BD;
  debounce en frontend.

  No necesitamos IA.

  B. Definition Analyzer / Smart Suggestions

  Esto es ligeramente diferente.

  Usuario escribe:

  Reducir gasto administrativo 10%

  KPI Management puede decir:

  This KPI may need more information.

  Specify what the 10% is compared against:

  ○ Previous period
  ○ Same period previous year
  ○ Previous full year
  ○ Specific baseline

  O:

  Aumentar clima laboral

  respuesta:

  This KPI could be more specific.

  How is "clima laboral" measured?

  ○ Survey percentage
  ○ Average survey score
  ○ Employee satisfaction index
  ○ Other

  Aquí entra el rule engine determinista que ya veníamos discutiendo.

  No un LLM.

  No RAG.

  No Monitoring.

  3. Flujo del Autosuggest

  Frontend:

  User types
  "Aumentar ventas tra"
          ↓
  debounce 250–400 ms
          ↓
  KPI Management API
          ↓
  Autocomplete Service
          ↓
  similar existing definitions
  +
  possible suggestions
          ↓
  dropdown

  Algo así:

  ┌───────────────────────────────────────────┐
  │ Aumentar ventas tra                      │
  ├───────────────────────────────────────────┤
  │ Existing KPIs                            │
  │ KPI-014 Aumentar ventas transporte       │
  │ KPI-083 Ventas transporte terrestre      │
  │                                           │
  │ Suggestions                              │
  │ Aumentar ventas transporte vs año anterior│
  │ Aumentar ventas transporte en USD        │
  └───────────────────────────────────────────┘

  Eso sí se siente como un autocomplete moderno.

  4. Archivos de KPI Management

  No le diría todavía a Codex que cree exactamente estos archivos sin revisar el repositorio. Pero esta debería ser la separación
  lógica.

  Por ejemplo:

  exa-kpi-management-service/
  src/
  ├── modules/
  │   ├── kpi-definitions/
  │   │   ├── kpi-definition.controller.ts
  │   │   ├── kpi-definition.service.ts
  │   │   ├── kpi-definition.repository.ts
  │   │   ├── kpi-definition.schemas.ts
  │   │   └── kpi-definition.routes.ts
  │   │
  │   ├── kpi-configurations/
  │   │   ├── kpi-configuration.controller.ts
  │   │   ├── kpi-configuration.service.ts
  │   │   ├── kpi-configuration.repository.ts
  │   │   ├── kpi-configuration.schemas.ts
  │   │   └── kpi-configuration.routes.ts
  │   │
  │   ├── autosuggest/
  │   │   ├── autosuggest.controller.ts
  │   │   ├── autosuggest.service.ts
  │   │   ├── autosuggest.rules.ts
  │   │   ├── autosuggest.schemas.ts
  │   │   └── autosuggest.routes.ts
  │   │
  │   ├── classification/
  │   │   ├── evaluation-classifier.ts
  │   │   ├── result-semantics-classifier.ts
  │   │   ├── definition-analyzer.ts
  │   │   └── classification.rules.ts
  │   │
  │   └── scoring-config/
  │       ├── scoring-config.service.ts
  │       ├── scoring-config.validator.ts
  │       └── scoring-config.schemas.ts

  Pero la instrucción para Codex debería ser:

  Si ya existen servicios equivalentes, reutilizarlos y no crear módulos duplicados solamente para hacer coincidir esta
  estructura.

  Eso es importante.

  5. ¿Qué devuelve Autosuggest?

  Algo sencillo:

  {
    "query": "reducir gasto administrativo 10%",
    "existingMatches": [
      {
        "kpiDefinitionId": "...",
        "code": "KPI-075",
        "name": "Reducir gasto administrativo"
      }
    ],
    "analysis": {
      "status": "NEEDS_CONFIRMATION",
      "behaviorCandidate": "LOWER_IS_BETTER",
      "behaviorConfidence": "MEDIUM",
      "resultSemanticsCandidate": null,
      "questions": [
        {
          "code": "CHANGE_REFERENCE_REQUIRED",
          "text": "¿El 10% se compara contra qué valor?"
        }
      ]
    }
  }

  Importante:

  Autosuggest
  ≠ Save

  Autosuggest
  ≠ APPROVED

  Autosuggest
  ≠ modificar automáticamente la Configuration

  Solo ayuda al usuario.

  6. ¿Qué NO pertenece a KPI Management?

  Nada de esto:

  August Result = 4782
  ValidationRun
  CURRENT / STALE
  Submitted
  Validated
  Closed
  Weighted Contribution de August
  Pool Monitoring Period
  Result revision
  Manual/Excel batch

  Eso es Monitoring.

  KPI Management puede definir la fórmula/configuración, pero no ejecutarla para un período real.

  7. KPI Pool: responsabilidad muy específica

  exa-kpi-pool-service debería encargarse de:

  Pool
  Pool Input Periods
  Pool KPI membership
  Pool companies
  temporal availability
  Pool-specific overrides
  effective settings before FINALIZED
  period progression

  Ejemplo:

  Global KPC-050-01
  Goal = 3700

  Pool Transporte:

  September
  Override = 4300

  Eso pertenece al Pool, no a Monitoring ni a KPI Management.

  KPI Management mantiene:

  global = 3700

  Pool mantiene:

  Transporte / September = override 4300
  8. Scorecards: composición

  Scorecards responde:

  ¿Qué KPIs/Targets forman parte de este Scorecard?

  ¿Cuánto pesa cada uno?

  ¿Qué departamentos/colaboradores pertenecen al scope?

  ¿Qué composición queda FINALIZED?

  Por ejemplo:

  Scorecard Transporte
  September 2026

  KPI-050
  Goal effective = 4300
  Weight = 20%

  KPI-060
  Goal = 95%
  Weight = 15%

  ...
  Total = 100%

  Cuando hace:

  FINALIZED

  esa composición queda congelada.

  Ese es el punto donde dejamos de preguntar:

  ¿Cuál es la configuración actual?

  9. Monitoring debe ser deliberadamente "tonto"

  Esto me parece fundamental.

  Monitoring NO debe intentar interpretar un KPI.

  Monitoring recibe algo como:

  KPI-050
  Configuration = KPC-050-01

  Goal Snapshot = 4300
  Unit Snapshot = km

  Behavior Snapshot =
  GREATER_IS_BETTER

  Result Semantics Snapshot =
  QUANTITY

  Scoring Method Snapshot =
  PROPORTIONAL

  Weight Snapshot =
  20%

  Traffic Threshold Snapshot =
  ...

  Scoring Config Snapshot =
  ...

  Y dice:

  Perfecto. Dame el Result.

  Nada más.

  10. Monitoring Results debe enfocarse SOLO en esto
  FINALIZED SCORECARD
          ↓
  Materialize Expected Results
          ↓
  Choose MANUAL / EXCEL
          ↓
  Enter Result
          ↓
  Save
          ↓
  Validate input
          ↓
  Calculate score
          ↓
  Traffic Light
          ↓
  Weighted Contribution
          ↓
  Check Results
          ↓
  Submit
          ↓
  Return if needed
          ↓
  Validate / Approve
          ↓
  Close

  Y luego:

  all Scorecards CLOSED
          ↓
  Pool Monitoring Period CLOSED
          ↓
  next period can progress

  Ese debería ser prácticamente todo su mundo.

  11. Cosas que Monitoring NUNCA debería hacer

  Esto lo pondría literalmente en el contexto de Codex:

  MONITORING MUST NOT:

  - classify KPI Definitions;
  - infer GREATER/LOWER from KPI names;
  - run Autosuggest;
  - modify KPI Configuration;
  - modify Global Goal;
  - create Pool Overrides;
  - resolve "latest KPI configuration";
  - change FINALIZED Scorecard composition;
  - decide KPI Definition semantics;
  - decide what Unit should be used;
  - invent scoring rules;
  - invent ZERO bands;
  - modify traffic-light configuration;
  - recalculate historical CLOSED periods with new configuration;

  Si Monitoring necesita alguno de esos datos:

  the upstream snapshot is incomplete

  y ese problema se arregla arriba.

  No dentro de Monitoring.

  12. Esto nos deja una arquitectura muy limpia
  ┌──────────────────────────────┐
  │       KPI MANAGEMENT         │
  │                              │
  │ Definition                   │
  │ Global Configuration         │
  │ Autosuggest                  │
  │ Classification Rules         │
  │ Scoring Config               │
  └───────────────┬──────────────┘
                  │
                  ▼
  ┌──────────────────────────────┐
  │          KPI POOL            │
  │                              │
  │ Membership                   │
  │ Input Period                 │
  │ Pool Overrides               │
  │ Effective Settings           │
  └───────────────┬──────────────┘
                  │
                  ▼
  ┌──────────────────────────────┐
  │         SCORECARDS           │
  │                              │
  │ KPI Assignment               │
  │ Weight                       │
  │ Scope                        │
  │ Composition                  │
  │ FINALIZED SNAPSHOT           │
  └───────────────┬──────────────┘
                  │
                  │ FROZEN
                  ▼
  ┌──────────────────────────────┐
  │      MONITORING RESULTS      │
  │                              │
  │ Expected Results             │
  │ Result Entry                 │
  │ Check Results                │
  │ Score                        │
  │ Validation                   │
  │ Submit                       │
  │ Validate                     │
  │ Close                        │
  └───────────────┬──────────────┘
                  │
                  ▼
  ┌──────────────────────────────┐
  │           REPORTS            │
  │                              │
  │ Historical results           │
  │ Compliance                   │
  │ Trends                       │
  │ Analysis                     │
  └──────────────────────────────┘

  Esa división me parece bastante buena para EXA.

  Y esto se lo agregaría al contexto de Codex
  SEPARATION OF RESPONSIBILITIES — HARD BOUNDARY

  Before implementing Monitoring Results, respect the following
  service ownership boundaries.

  ==================================================
  KPI MANAGEMENT OWNERSHIP
  ==================================================

  exa-kpi-management-service exclusively owns:

  - KPI Definition
  - KPI Configuration
  - Global KPI Configuration
  - Result Semantics
  - Evaluation Behavior
  - Scoring Method
  - Scoring Rule Configuration
  - Measurement Unit
  - Data Source definition
  - Traffic Light configuration
  - Goal Mode
  - Configuration Targets
  - configuration completeness/approval
  - KPI Definition Autosuggest
  - deterministic Definition Analyzer
  - deterministic Behavior/Semantics proposals

  Monitoring must NOT implement any of these responsibilities.

  ==================================================
  AUTOSUGGEST
  ==================================================

  Autosuggest belongs exclusively to KPI Management.

  There are two related capabilities:

  1. Existing KPI autocomplete

  While typing a KPI Definition name, return similar existing
  KPI Definitions to reduce duplication.

  Example:

  User types:

  "Aumentar ventas tra"

  Possible results:

  KPI-014 — Aumentar ventas transporte
  KPI-083 — Ventas transporte terrestre

  Use deterministic text search / normalization / similarity.

  Frontend should use debounce.

  Do NOT use LLM/RAG for this feature.

  2. Definition Analyzer

  Analyze the typed KPI Definition and identify when additional
  business information is required.

  Examples:

  "Reducir gasto administrativo 10%"

  may require:

  "What is the 10% compared against?"

  "Aumentar clima laboral"

  may require:

  "How is clima laboral measured?"

  The analyzer may propose:

  Behavior Candidate
  Result Semantics Candidate
  Confidence
  Clarification Questions

  It must NOT automatically APPROVE a KPI Configuration.

  Autosuggest is advisory.

  ==================================================
  KPI MANAGEMENT FILE OWNERSHIP
  ==================================================

  Inspect the current service structure first.

  Map the responsibilities above to existing:

  controllers
  services
  repositories
  routes
  schemas
  rules
  tests

  Do NOT create duplicate modules if equivalents already exist.

  If appropriate, logical modules may resemble:

  kpi-definitions/
  kpi-configurations/
  autosuggest/
  classification/
  scoring-config/

  But existing architecture takes precedence.

  Report exact existing files that should own each responsibility.

  ==================================================
  KPI POOL OWNERSHIP
  ==================================================

  exa-kpi-pool-service owns:

  - Pool
  - Pool membership
  - Input Periods
  - Pool Companies
  - temporal KPI availability
  - Pool-specific configuration overrides
  - effective Pool settings before FINALIZED
  - Pool period progression

  Pool Override must NOT mutate the Global KPI Configuration.

  ==================================================
  SCORECARD OWNERSHIP
  ==================================================

  exa-scorecards-service owns:

  - Scorecard
  - KPI/Target assignment
  - weights
  - linked composition later
  - departments/collaborators scope
  - Input Period composition
  - FINALIZED boundary

  At FINALIZED:

  freeze the exact effective KPI settings required by Monitoring.

  FINALIZED must never be silently mutated by later:

  - Global KPI edits
  - Pool Overrides
  - future configuration changes

  ==================================================
  MONITORING OWNERSHIP
  ==================================================

  exa-monitoring-service owns ONLY the execution of an already
  configured and FINALIZED measurement.

  Monitoring receives frozen Expected Result configuration.

  Monitoring owns:

  - Pool Monitoring Period
  - Monitoring Scorecard Period
  - Expected Results
  - selectedEntryMethod
  - Manual Result Entry
  - Excel later
  - Result persistence
  - Result revisions
  - resultsVersion
  - Validation Runs
  - CURRENT / STALE
  - scoring execution
  - Raw Achievement
  - Compliance
  - Traffic Light execution
  - Weighted Contribution
  - Submit
  - Return for Correction
  - Validate
  - Close
  - Closure Snapshot
  - aggregate Pool Monitoring closure
  - notification/projection required for next-period progression

  Monitoring DOES NOT own KPI meaning.

  ==================================================
  MONITORING MUST NEVER
  ==================================================

  Monitoring must NOT:

  - classify KPI names;
  - infer Behavior from text;
  - infer Result Semantics from text;
  - run KPI Autosuggest;
  - modify KPI Definition;
  - modify KPI Configuration;
  - modify Global Goal;
  - create Pool Overrides;
  - decide what Measurement Unit should be used;
  - invent scoring methods;
  - invent scoring bands;
  - invent Traffic Light thresholds;
  - resolve the latest KPI Configuration after FINALIZED;
  - alter FINALIZED Scorecard composition;
  - recalculate historical CLOSED periods using new configuration.

  If required snapshot information is missing:

  treat the upstream contract as incomplete.

  Do not repair it by inventing configuration inside Monitoring.

  ==================================================
  REPORTING OWNERSHIP
  ==================================================

  exa-reporting-service is read-oriented.

  Reports later consumes:

  - closed/validated Monitoring results
  - frozen Goal
  - Result
  - Raw Achievement
  - Compliance
  - Traffic Light
  - Weight
  - Weighted Contribution
  - Scorecard
  - Pool
  - Input Period
  - historical snapshots

  Reports must NOT recalculate historical Scores using current
  KPI Configuration.

  ==================================================
  ANALYSIS REQUIRED
  ==================================================

  Before implementing Result Entry, report:

  1. Which existing files currently violate these boundaries.
  2. Which Monitoring files currently contain configuration logic
     that belongs to KPI Management.
  3. Which KPI Management files should own Autosuggest.
  4. Whether current frontend performs scoring/classification logic
     that should move to backend.
  5. Whether Scorecards currently freeze sufficient settings at FINALIZED.
  6. Whether Monitoring currently resolves latest configuration dynamically.
  7. What minimal contract changes are required to enforce these boundaries.

  Con esto ya se vuelve muy difícil que Codex empiece a meter cosas como inferEvaluationType() dentro de ResultEntry.tsx ☠️.

  La frase que yo usaría como regla mental para todo el proyecto es:

  KPI Management piensa y configura. Pool contextualiza. Scorecard compone y congela. Monitoring ejecuta. Reports observa.

  Si mantenemos esa frase, la arquitectura se vuelve mucho más manejable.


• Entendido y queda como frontera contractual:

  > KPI Management piensa y configura. Pool contextualiza. Scorecard compone y congela. Monitoring ejecuta. Reports observa.

  La consecuencia más importante para la futura implementación es esta:

  Si Monitoring recibe un snapshot incompleto:
  → reporta contrato upstream incompleto
  → bloquea cálculo de forma determinista
  → no infiere, completa ni inventa configuración

  Monitoring puede ejecutar el scoring congelado, pero no decidir qué scoring corresponde. Del mismo modo, puede aplicar Traffic
  Lights congelados, pero jamás crearlos o corregirlos.

  También quedan claramente separados:

  - KPI Management: autosuggest, clasificación, semántica, configuración y aprobación.
  - KPI Pool: membresía, temporalidad, overrides y effective settings.
  - Scorecards: selección, pesos, scope y snapshot FINALIZED.
  - Monitoring: resultados, revisiones, validación, cálculo y workflow.
  - Reports: lectura histórica sin recalcular.

  Esto refuerza el hallazgo del análisis anterior: la primera tarea de Monitoring sigue siendo promover MonitoringPeriodScorecard
  al agregado operativo. No debe incluir clasificación, autosuggest, resolución dinámica de KPI Configurations ni cambios en las
  reglas del Pool.

  No implementé ni modifiqué nada con este nuevo contexto. Antes de autorizar Task 1, el análisis pendiente sería únicamente
  señalar archivos actuales que cruzan estas fronteras y los cambios contractuales mínimos para corregirlos.