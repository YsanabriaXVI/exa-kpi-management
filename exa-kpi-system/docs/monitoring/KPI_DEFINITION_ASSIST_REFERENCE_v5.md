# KPI_DEFINITION_ASSIST_REFERENCE.md

**Version:** v5  
**Status:** Conceptual reference freeze for Definition Assist before implementation  
**Purpose:** curated business-reference knowledge for deterministic KPI Autosuggest, Possible Existing KPI, Definition Analyzer, AutoClassifier, conditional questions, fixtures and tests.

---

## 1. Authority and Decision Precedence

When sources disagree, use this order:

1. Explicit latest business decisions confirmed by the user.
2. Current architectural principles of the EXA KPI system.
3. Trusted examples in this v5 reference.
4. Edge / Ambiguous cases in this v5 reference.
5. Synthetic fixtures only as tests.
6. Never convert an inference automatically into a persisted business decision.

This v5 **supersedes v4 terminology** where they conflict.

In particular:

- `COMPARISON` is **not** a Calculation Pattern.
- `CURRENT_PERIOD` is **not** a Comparison Mode.
- Absence of comparison is `NONE`.
- Behavior describes the favorable direction of the **business metric being evaluated**, not the Compliance percentage.
- Comparison is a separate dimension from the way the Current Result is calculated.

---

## 2. Core Principles

> **REFERENCE DATA ≠ DATABASE MODEL.**

> **Analyzer proposal ≠ persisted business decision ≠ Frozen Snapshot ≠ Monitoring Result.**

> **The user always owns the KPI Name.**

- This file is reference knowledge, not a Prisma/schema/migration plan.
- The user may keep any KPI name they want even if Autosuggest proposes another name.
- `Normalized Name` is for matching, similarity, duplicate detection and deterministic rules; it must not silently replace the display name.
- Confidence, hints, analyzer questions and ambiguity metadata belong to Definition Assist.
- Monitoring must never parse the KPI name to decide how to calculate it.
- Capture the real business value whenever possible: USD, gallons, kilometers, containers, customers, incidents, ratios, percentages, etc.
- Derived comparison values may be shown, but they do not replace the underlying business value unless the business explicitly chooses that reporting model.
- Location, fleet, operation type or similar scope usually belongs to Configuration, unless it materially changes the KPI concept or formula.
- HIGH confidence is still a proposal, not approval.

---

## 3. Review Summary

Source workbook review already completed in the previous curation cycle:

- Historical workbook sheets reviewed: **31 / 31**.
- Historical KPI occurrences reviewed: **200+**.
- Approximate distinct concepts after deduplication: **~90**.
- v5 intentionally keeps a compact trusted corpus rather than promoting every historical occurrence.
- Linked Scorecards, collaborator rows, weights, historical scores, Excel formulas and administrative metadata are not KPI classification knowledge.
- Synthetic Import / Export / La Mega fixtures remain separated from historical evidence.

The objective is **quality of patterns, not maximum row count**.

---

## 4. Canonical Vocabulary

### 4.1 Families

`SALES`  
`COST`  
`PRODUCTIVITY`  
`INCIDENTS`  
`TIME`  
`INVENTORY`  
`UTILIZATION`  
`QUALITY`  
`COMPLIANCE`  
`CLIENTS`  
`MAINTENANCE`  
`FINANCE`  
`OTHER`  
`UNKNOWN`

Do not create dozens of families in V1.

---

### 4.2 Behaviors

`GREATER_IS_BETTER`  
`LOWER_IS_BETTER`  
`ZERO_IS_BETTER`  
`RANGE`  
`EQUAL_IS_BETTER`  
`BINARY`  
`MILESTONE`

Behavior answers:

> **What direction is favorable for the business metric being evaluated?**

Examples:

- Sales USD → `GREATER_IS_BETTER`
- Cost USD/KM → `LOWER_IS_BETTER`
- Incident count → `ZERO_IS_BETTER`

Behavior does **not** describe whether Compliance itself goes up or down.

---

### 4.3 Result Semantics

`ABSOLUTE_VALUE`  
`COUNT`  
`QUANTITY`  
`PERCENTAGE`  
`RATIO`  
`CHANGE_PERCENT`

Result Semantics describes the value considered the KPI Result.

Important:

- A historical comparison of sales can keep `ABSOLUTE_VALUE` because Current Result is still sales in USD.
- A comparison may derive an additional `% change` without converting the original Result Semantics to `CHANGE_PERCENT`.
- Use `CHANGE_PERCENT` when the actual configured Result itself is the change percentage.

---

### 4.4 Confidence

`HIGH`  
`MEDIUM`  
`LOW`

Confidence should remain separable by field:

- Behavior Confidence
- Semantics Confidence
- Comparison confidence if later useful

HIGH does not mean approved.

---

### 4.5 Analysis Status

`GOOD`  
`NEEDS_DETAIL`  
`NEEDS_CONFIRMATION`

- `GOOD` — enough evidence to continue without another clarification question.
- `NEEDS_DETAIL` — the KPI is too generic or incomplete.
- `NEEDS_CONFIRMATION` — two or more reasonable interpretations can materially change the Result, formula, unit, comparison or business meaning.

---

### 4.6 Calculation Pattern

Calculation Pattern answers:

> **How is Current Result obtained?**

Canonical conceptual values:

- `DIRECT` — Current Result is the observed KPI value without a business transformation formula.
- `DERIVED` — Current Result is calculated from current-period inputs using a known formula.
- `MULTI_INPUT_CURRENT_PERIOD` — several current-period inputs are relevant, but there is no approved single collapse/weighting formula yet.
- `COMPOSITE` — several components are combined into one Result using an official business formula/weighting model.

Important:

- `DIRECT` does not necessarily mean manual entry. A direct value may come from manual entry, Excel, EMS, ERP or API.
- Capture source is a different dimension from Calculation Pattern.
- `COMPARISON` is **not** a Calculation Pattern.
- Multiple inputs do not automatically imply `COMPOSITE`.

---

### 4.7 Comparison Mode

Comparison Mode answers:

> **Against which reference should this KPI be evaluated, if any?**

Canonical conceptual values:

- `NONE`
- `PREVIOUS_PERIOD`
- `SAME_PERIOD_PREVIOUS_YEAR`
- `CUSTOM_PERIOD`

`CUSTOM_PERIOD` covers a specifically selected historical reference that is not represented by the standard previous-period modes.

Absence of comparison is `NONE`.

Do not use `CURRENT_PERIOD` as a Comparison Mode.

---

### 4.8 Comparison Direction

`INCREASE`  
`REDUCTION`

This is independent of Behavior.

Example:

**Reducir costo por KM 10%**

- Business metric: Cost USD/KM
- Behavior: `LOWER_IS_BETTER`
- Comparison Direction: `REDUCTION`

---

### 4.9 Baseline Source — downstream conceptual vocabulary

Baseline resolution is primarily a Monitoring concern, not Definition Assist persistence.

Priority confirmed conceptually:

1. `SELF_HISTORY`
2. `MAPPED_KPI_CONFIGURATION`
3. `MANUAL`
4. `BASELINE_MISSING`

Rules:

- Missing baseline never equals `0`.
- Historical equivalence is primarily between concrete KPI Configurations, not merely Definitions.
- Similarity may suggest a mapping; it must never approve a mapping automatically.
- A manual baseline must not be silently overwritten by Refresh.
- CLOSED historical evaluations must preserve the baseline value and provenance actually used.

---

## 5. Capture and Comparison Rules

1. Capture the real operational/business value first whenever possible.
2. Do not force the user to type a derived percentage when the system can preserve the underlying evidence.
3. Calculation Pattern and Comparison Mode are independent dimensions.
4. A DIRECT KPI can have `Comparison Mode = NONE`, `PREVIOUS_PERIOD`, `SAME_PERIOD_PREVIOUS_YEAR` or `CUSTOM_PERIOD`.
5. A DERIVED KPI can also be compared historically.
6. A percentage appearing in the KPI name does not automatically mean `Result Semantics = PERCENTAGE`.
7. `Aumentar X%` does not automatically explain what the percentage is compared against.
8. `Reducir` does not automatically determine `LOWER_IS_BETTER` if the meaning of Result is unclear.
9. If a required baseline is unavailable, do not invent it and do not silently choose another period.
10. Scope such as Puerto Cortés, San Lorenzo, Flota Nueva, TRANEXPA, IMPORT, EXPORT or La Mega normally belongs to Configuration.
11. `Interno / Externo` does not automatically mean `Import / Export`.
12. The Analyzer should detect comparison intent but must not implement baseline lookup or Monitoring calculations.

---

## 6. Comparative KPI Context

### 6.1 Confirmed GREATER comparative example

Example:

- Baseline = 100,000
- Goal = +10%
- Target Value = 110,000
- Current Result = 105,000
- Derived Change = +5%

For the currently confirmed GREATER comparative case:

`Compliance Rate = Current Result / Target Value × 100`

Result:

`105,000 / 110,000 × 100 = 95.45%`

`Goal Met = false`

Do **not** use:

`Achieved Change / Target Change`

as the official Compliance Rate for this model.

Compliance may exceed 100%. No global cap is defined here.

### 6.2 Goal Met

Conceptual states:

- `true` → achieved
- `false` → not achieved
- `null` → not currently evaluable

Confirmed for `GREATER_IS_BETTER`:

`goalMet = Current Result >= Target Value`

Rules for other Behaviors remain open.

### 6.3 Deliberately open

This reference does **not** decide:

- exact comparative scoring for `LOWER_IS_BETTER`
- exact scoring for `ZERO_IS_BETTER`
- RANGE / EQUAL / BINARY / MILESTONE scoring
- target construction for reduction
- goal internal representation (`10`, `10%`, `0.10`, signed values)
- zero/negative target behavior
- negative baseline/current-result behavior
- Compliance caps
- Traffic Light semantics
- rounding policy
- physical baseline persistence
- mapping tables
- API contracts

Definition Assist may detect these concepts without making them executable.

---

## 7. Trusted KPI Reference

Columns in this table are **reference/analyzer fields**, not database requirements.

| Original KPI Name | Normalized Name | Calculation Pattern | Family | Behavior | Behavior Confidence | Result Semantics | Semantics Confidence | Comparison Detected | Comparison Mode Hint | Comparison Direction | Unit Hint | Cadence Hint | Requires Confirmation | Suggested Question | Suggestion Eligible | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2.2 Reducir costo de M&R de chasis propios | reducir costo de m&r de chasis propios | DERIVED | COST | LOWER_IS_BETTER | HIGH | RATIO | HIGH | NO | NONE | REDUCTION | USD/KM | — | NO | — | YES | Current business metric is M&R cost per km. Historical comparison may be configured separately. |
| 1.4 Lograr meta de ventas en alquileres de contenedores reefer (solo o en combo) | ventas alquileres de contenedores reefer solo o combo | DIRECT | SALES | GREATER_IS_BETTER | HIGH | ABSOLUTE_VALUE | HIGH | NO | NONE | — | USD | — | NO | — | YES | Direct monetary sales target. |
| 1.7 Lograr ventas de gasolinera de galones | ventas de gasolinera en galones | DIRECT | SALES | GREATER_IS_BETTER | HIGH | QUANTITY | HIGH | NO | NONE | — | GALLONS | — | NO | — | YES | Physical volume sold. |
| 1.17 Aumentar el número de clientes semestralmente | aumentar numero de clientes semestralmente | DIRECT | CLIENTS | GREATER_IS_BETTER | HIGH | COUNT | HIGH | NO | NONE | INCREASE | CLIENTS | SEMIANNUAL | YES | ¿“Número de clientes” significa clientes activos totales o clientes nuevos obtenidos durante el semestre? | YES | Comparison is not inferred unless explicitly configured. |
| 2.20 Margen operativo de tienda | margen operativo de tienda | DERIVED | FINANCE | GREATER_IS_BETTER | HIGH | PERCENTAGE | HIGH | NO | NONE | — | % | — | YES | ¿Qué rubros considera EXA dentro de los costos operativos de la tienda? | YES | Formula family is clear; accounting scope requires confirmation. |
| 2.12 Costo por mes por GPS | costo mensual por gps | DIRECT | COST | LOWER_IS_BETTER | HIGH | ABSOLUTE_VALUE | HIGH | NO | NONE | — | USD/GPS/MONTH | MONTHLY | NO | — | YES | Direct recurring cost. |
| 6.1 Aumentar rotación de inventario | aumentar rotacion de inventario | DERIVED | INVENTORY | GREATER_IS_BETTER | MEDIUM | RATIO | HIGH | NO | NONE | INCREASE | TURNS | — | NO | — | YES | Inventory turnover is a derived ratio. |
| 7.2 95% de clientes activos dentro del período de recuperación | clientes activos dentro del periodo de recuperacion | DERIVED | CLIENTS | GREATER_IS_BETTER | HIGH | PERCENTAGE | HIGH | NO | NONE | — | % | — | NO | — | YES | Derived percentage of qualifying active clients. |
| 6.2 Disminuir a 5% el desuso de los chasis | desuso de chasis con mas de 30 dias en yarda | DERIVED | UTILIZATION | LOWER_IS_BETTER | HIGH | PERCENTAGE | HIGH | NO | NONE | REDUCTION | % | — | NO | — | YES | Current Result is the current unused-equipment percentage. |
| 6.5 Disminuir a 0-1 el desuso de cabezales propios | desuso de cabezales propios | DIRECT | UTILIZATION | ZERO_IS_BETTER | HIGH | COUNT | HIGH | NO | NONE | REDUCTION | HEADS | — | NO | — | YES | 0 is best; text 0-1 is not automatically RANGE. |
| 3.6 Cierres contables a más tardar el 6 de cada mes | cierres contables a mas tardar el dia 6 | DIRECT | COMPLIANCE | MILESTONE | MEDIUM | COUNT | MEDIUM | NO | NONE | — | ON-TIME CLOSINGS | MONTHLY | YES | ¿El Result será día de cierre, cumplimiento sí/no o cantidad de cierres a tiempo? | YES | Deadline pattern; executable scoring remains future unless business rule is confirmed. |
| 1.9 Aumento en ventas de GPS a terceros (nuevos clientes) | ventas de gps a terceros nuevos clientes | DIRECT | SALES | GREATER_IS_BETTER | HIGH | COUNT | HIGH | NO | NONE | INCREASE | INSTALLATIONS/MONTH | MONTHLY | NO | — | YES | Historical unit indicates installed units/month. |
| 3. Cero incidentes mayores de seguridad y sostenibilidad | cero incidentes mayores de seguridad y sostenibilidad | DIRECT | INCIDENTS | ZERO_IS_BETTER | HIGH | COUNT | HIGH | NO | NONE | — | INCIDENTS | — | NO | — | YES | Strong zero-incident pattern. |
| 5.6 Aprovechamiento GPS | aprovechamiento gps | DERIVED | UTILIZATION | GREATER_IS_BETTER | MEDIUM | PERCENTAGE | MEDIUM | NO | NONE | — | % | — | YES | ¿Cuál es la fórmula oficial de aprovechamiento GPS? | YES | Historical values suggest a rate; formula should be explicit in Configuration. |
| 2.21 Aumentar % neto del servicio de transporte | porcentaje neto del servicio de transporte | DERIVED | SALES | GREATER_IS_BETTER | HIGH | PERCENTAGE | HIGH | NO | NONE | INCREASE | % | — | NO | — | YES | Percentage result is explicit. |
| 1.8 Aumentar ventas en TREXA | aumentar ventas en trexa | DIRECT | SALES | GREATER_IS_BETTER | HIGH | ABSOLUTE_VALUE | HIGH | NO | NONE | INCREASE | USD | — | NO | — | YES | Monetary sales. |
| 1.16 Aumentar servicio de almacenamiento y M&R | aumentar servicio de almacenamiento y m&r | MULTI_INPUT_CURRENT_PERIOD | SALES | GREATER_IS_BETTER | MEDIUM | — | LOW | NO | NONE | INCREASE | SERVICES / CONTAINERS / USD | — | YES | ¿Result representa ingresos, número de servicios, contenedores atendidos u otra medida? | YES | Do not collapse multiple current-period signals without an approved formula. |
| 3.7 Cero accidentes mayores y/o robos TRANEXPA | cero accidentes mayores o robos tranexpa | DIRECT | INCIDENTS | ZERO_IS_BETTER | HIGH | COUNT | HIGH | NO | NONE | — | INCIDENTS | — | NO | — | YES | Direct zero-event KPI. |
| 5.10 Aumentar kms TRANEXPA | aumentar km tranexpa | DIRECT | PRODUCTIVITY | GREATER_IS_BETTER | HIGH | QUANTITY | HIGH | NO | NONE | INCREASE | KM | — | NO | — | YES | Explicit quantity in kilometers. |
| 5.3 Productividad cabezales TRANEXPA | productividad cabezales tranexpa | DERIVED | PRODUCTIVITY | GREATER_IS_BETTER | MEDIUM | RATIO | MEDIUM | NO | NONE | — | KM/HEAD/MONTH | MONTHLY | YES | ¿La productividad se reporta oficialmente como km/cabezal/mes? | YES | Scope variant of the productivity concept. |
| 2.22 Aumentar margen neto alquiler de contenedores secos TREXA | margen neto alquiler contenedores secos trexa | DERIVED | FINANCE | GREATER_IS_BETTER | HIGH | PERCENTAGE | MEDIUM | NO | NONE | INCREASE | % | — | YES | ¿Qué costos forman parte del margen neto oficial? | YES | Margin is derived; accounting scope must be confirmed. |
| 3.6.1 Cierre TREXA | cierre trexa | DIRECT | COMPLIANCE | MILESTONE | MEDIUM | COUNT | MEDIUM | NO | NONE | — | ON-TIME CLOSINGS | — | YES | ¿Qué condición exacta define un cierre TREXA cumplido? | YES | Milestone/deadline family. |
| 1.14 Incrementar gate out de contenedores Puerto Cortés | incrementar gate out de contenedores puerto cortes | DIRECT | PRODUCTIVITY | GREATER_IS_BETTER | HIGH | COUNT | HIGH | NO | NONE | INCREASE | CONTAINERS | — | NO | — | YES | Puerto Cortés is scope/location. |
| 2.13 Reducir costo de M&R por contenedor Puerto Cortés | costo de m&r por contenedor puerto cortes | DERIVED | COST | LOWER_IS_BETTER | HIGH | RATIO | HIGH | NO | NONE | REDUCTION | USD/CONTAINER | — | NO | — | YES | Direct business metric is cost per container. |
| 2.14 Reducir costo máquinas Puerto Cortés | costo de maquinas por contenedor puerto cortes | DERIVED | COST | LOWER_IS_BETTER | HIGH | RATIO | HIGH | NO | NONE | REDUCTION | USD/CONTAINER | — | NO | — | YES | Explicit cost-per-container pattern. |
| 5.11 # de fallas operativas adjudicables al predio Puerto Cortés | fallas operativas adjudicables al predio puerto cortes | DIRECT | QUALITY | LOWER_IS_BETTER | HIGH | COUNT | HIGH | NO | NONE | — | FAILURES | — | NO | — | YES | Direct failure count. |
| 6.2.1 Disminuir a 5% el desuso de los equipos Puerto Cortés | desuso de equipos puerto cortes con mas de 30 dias en yarda | DERIVED | UTILIZATION | LOWER_IS_BETTER | MEDIUM | PERCENTAGE | MEDIUM | NO | NONE | REDUCTION | % | — | YES | ¿Result es porcentaje de equipos en desuso o cantidad de equipos? | YES | Historical unit metadata conflicts with the percentage wording. |
| 6.4 No exceder a 5 equipos en desuso generadores | generadores en desuso | DIRECT | UTILIZATION | LOWER_IS_BETTER | HIGH | COUNT | HIGH | NO | NONE | — | GENERATORS | — | NO | — | YES | Maximum-count constraint; not automatically RANGE. |
| 5.15 # de fallas operativas adjudicables al predio San Lorenzo | fallas operativas adjudicables al predio san lorenzo | DIRECT | QUALITY | LOWER_IS_BETTER | HIGH | COUNT | HIGH | NO | NONE | — | FAILURES | — | NO | — | YES | Same operational concept with different scope. |
| 6.2.2 Disminuir a 1% el desuso de los equipos San Lorenzo | desuso de equipos san lorenzo con mas de 30 dias en yarda | DERIVED | UTILIZATION | LOWER_IS_BETTER | MEDIUM | PERCENTAGE | MEDIUM | NO | NONE | REDUCTION | % | — | YES | ¿Result es porcentaje de equipos en desuso o cantidad de equipos? | YES | Name and historical unit conflict. |
| 2.19 Gasto administrativo gasolinera 3%/ventas | gasto administrativo gasolinera sobre ventas | DERIVED | COST | LOWER_IS_BETTER | HIGH | RATIO | HIGH | NO | NONE | — | % OF SALES | — | NO | — | YES | Ratio of administrative expense to sales. |
| 2.21 Margen operativo de la gasolinera | margen operativo de la gasolinera | DERIVED | FINANCE | GREATER_IS_BETTER | HIGH | PERCENTAGE | MEDIUM | NO | NONE | — | % | — | YES | ¿Qué costos forman parte del margen operativo oficial? | YES | Operating-margin pattern. |
| 1.11 Tienda de conveniencia (Primeros 4 meses 15k USD y 25k USD) | ventas tienda de conveniencia | DIRECT | SALES | GREATER_IS_BETTER | MEDIUM | ABSOLUTE_VALUE | HIGH | NO | NONE | — | USD | MONTHLY | YES | ¿La meta mensual cambia después de los primeros cuatro meses? | YES | Target schedule is embedded in historical wording. |
| 4. Aumentar clima laboral | aumentar clima laboral | MULTI_INPUT_CURRENT_PERIOD | OTHER | GREATER_IS_BETTER | HIGH | PERCENTAGE | MEDIUM | NO | NONE | INCREASE | % + SUPPORTING COUNTS | — | YES | ¿Cuál es el indicador oficial principal de clima laboral y qué inputs son solo apoyo? | YES | Do not invent weighted composite scoring. |
| 6. Aumentar el ROA | aumentar roa | DERIVED | FINANCE | GREATER_IS_BETTER | HIGH | PERCENTAGE | HIGH | NO | NONE | INCREASE | % | — | NO | — | YES | ROA = net income / total assets × 100. Historical comparison is a separate Configuration dimension. |
| 7. Disminuir el D/E | disminuir deuda sobre patrimonio | DERIVED | FINANCE | LOWER_IS_BETTER | HIGH | RATIO | HIGH | NO | NONE | REDUCTION | RATIO | — | NO | — | YES | D/E = debt / equity. Historical comparison is a separate dimension. |
| 8. Innovaciones estratégicas de sistemas de impacto recurrente | innovaciones estrategicas de sistemas de impacto recurrente | DERIVED | OTHER | GREATER_IS_BETTER | HIGH | PERCENTAGE | HIGH | NO | NONE | INCREASE | % | — | YES | ¿La fórmula oficial será proyectos completados / proyectos planificados? | YES | Historical sub-items should not automatically become separate KPI Definitions. |
| 1.2 Lograr meta de contenedores | vender contenedores | DIRECT | SALES | GREATER_IS_BETTER | HIGH | COUNT | HIGH | NO | NONE | INCREASE | CONTAINERS | — | YES | ¿Cuál es el período/cadencia de la meta? | YES | Direct container sales count. |
| 3.9 On time delivery without service incidents | on time delivery without service incidents | DERIVED | QUALITY | GREATER_IS_BETTER | HIGH | PERCENTAGE | HIGH | NO | NONE | — | % | — | NO | — | YES | Result = compliant deliveries / total deliveries × 100 when business formula is confirmed. |
| 2.15 Aumentar margen de M&R por contenedor San Lorenzo | margen de m&r por contenedor san lorenzo | DERIVED | FINANCE | GREATER_IS_BETTER | HIGH | RATIO | HIGH | NO | NONE | INCREASE | USD/CONTAINER | — | NO | — | YES | Formula: (M&R Revenue - M&R Cost) / Total Containers. |
| 3.8 Aumentar satisfacción al cliente | aumentar satisfaccion al cliente | MULTI_INPUT_CURRENT_PERIOD | CLIENTS | GREATER_IS_BETTER | HIGH | PERCENTAGE | HIGH | NO | NONE | INCREASE | % + SUPPORTING COUNTS | — | YES | ¿Cuál es el indicador oficial principal de satisfacción y qué métricas son solo apoyo? | YES | Do not invent a weighted composite. |
| 1.15 Aumento de ventas EXA Parts (Interno + externo) | aumentar ventas exa parts | DERIVED | SALES | GREATER_IS_BETTER | HIGH | ABSOLUTE_VALUE | HIGH | NO | NONE | INCREASE | USD | — | NO | — | YES | Current Result = Internal Sales + External Sales. Do not map Interno/Externo to Import/Export automatically. |

---

## 8. Edge / Ambiguous Cases

Keep an item here when the unresolved decision can change Result meaning, unit, Calculation Pattern, Comparison Mode, Behavior or formula.

| Original KPI Name | Normalized Name | Calculation Pattern | Family | Behavior | Behavior Confidence | Result Semantics | Semantics Confidence | Comparison Detected | Comparison Mode Hint | Comparison Direction | Unit Hint | Cadence Hint | Requires Confirmation | Suggested Question | Suggestion Eligible | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Reducir gasto administrativo 10% | reducir gasto administrativo | — | COST | — | LOW | — | LOW | POSSIBLE | — | REDUCTION | USD / % | — | YES | ¿Result será el gasto actual o la reducción lograda? Si hay reducción contra baseline, ¿contra qué período/referencia? | YES | Do not force LOWER or GREATER until Result meaning is resolved. |
| Aumentar ventas 10% | aumentar ventas | DIRECT | SALES | GREATER_IS_BETTER | MEDIUM | ABSOLUTE_VALUE | MEDIUM | POSSIBLE | — | INCREASE | USD / configured currency | — | YES | ¿10% respecto a qué: período anterior, mismo período del año anterior, período específico o es solo una meta directa? | YES | “Aumentar” + percentage does not define comparison basis by itself. |
| 1.5 Aumentar rentas bienes y raíces | aumentar rentas bienes y raices | DIRECT | SALES | GREATER_IS_BETTER | HIGH | ABSOLUTE_VALUE | HIGH | NO | NONE | INCREASE | USD / configured currency | — | YES | ¿La Configuration debe evaluar solo la renta actual o compararla contra otro período? | YES | V4 incorrectly modeled COMPARISON as Calculation Pattern. V5 keeps Current Result direct and comparison separate. |
| 1.13 Aumentar servicio de almacenamiento y M&R San Lorenzo | aumentar servicio de almacenamiento y m&r san lorenzo | MULTI_INPUT_CURRENT_PERIOD | MAINTENANCE | GREATER_IS_BETTER | MEDIUM | — | LOW | NO | NONE | INCREASE | CONTAINERS / SERVICES / USD | — | YES | ¿Cuál es el Result principal: contenedores atendidos, servicios realizados, ingresos o varias métricas independientes? | YES | Do not auto-sum or monetize current-period inputs. |
| 2.6 Aumento en 20% en margen de contribución bruta venta de contenedores | aumentar margen contribucion bruta venta contenedores | DERIVED | FINANCE | GREATER_IS_BETTER | HIGH | PERCENTAGE | HIGH | POSSIBLE | — | INCREASE | % | — | YES | ¿20% es el margen objetivo o un aumento de 20% respecto a un baseline? | YES | Formula family can be known while target semantics remain ambiguous. |
| 2.7 Aumento en 20% en margen de contribución bruta alquiler de bodegas | aumentar margen contribucion bruta alquiler bodegas | DERIVED | FINANCE | GREATER_IS_BETTER | HIGH | PERCENTAGE | HIGH | POSSIBLE | — | INCREASE | % | — | YES | ¿20% es el margen objetivo o un aumento de 20% respecto a un baseline? | YES | Do not infer historical comparison solely from the percentage wording. |
| Mantener costo/km | mantener costo por km | DIRECT / DERIVED | COST | — | LOW | RATIO | HIGH | NO | NONE | — | USD/KM | — | YES | ¿“Mantener” significa no exceder un máximo o permanecer cerca de un valor objetivo con tolerancia? | YES | Do not automatically classify as EQUAL or RANGE. |
| Aumentar kms clientes (Rango 110-90) | aumentar km clientes rango 110 90 | DIRECT | PRODUCTIVITY | — | LOW | QUANTITY | MEDIUM | NO | NONE | INCREASE | KM / THOUSANDS KM | — | YES | ¿90–110 es rango aceptable del Result, rango de Compliance o una referencia histórica? | YES | The word “Rango” is insufficient to assign RANGE. |
| Días de facturación | dias de facturacion | DIRECT | TIME | — | LOW | COUNT | MEDIUM | NO | NONE | — | DAYS | — | YES | ¿Result significa días transcurridos para facturar o cantidad de días facturados/cubiertos? | YES | Historical scoring evidence was contradictory. |
| Aumentar clima laboral | aumentar clima laboral | MULTI_INPUT_CURRENT_PERIOD | OTHER | GREATER_IS_BETTER | MEDIUM | — | LOW | NO | NONE | INCREASE | — | — | YES | ¿Cuál es el indicador principal que representa clima laboral: encuesta, porcentaje favorable, score u otro? | YES | The name alone is too generic to define the Result. |
| Aumentar ventas 10% vs 2022 | aumentar ventas vs 2022 | DIRECT | SALES | GREATER_IS_BETTER | HIGH | ABSOLUTE_VALUE | HIGH | YES | CUSTOM_PERIOD | INCREASE | USD / configured currency | — | YES | ¿El baseline exacto es el total 2022, el mismo subperíodo 2022 o un valor histórico específico? | YES | Capture real Current Sales; historical comparison is separate. |

`POSSIBLE` above is reference notation meaning the wording suggests comparative intent but the Analyzer must resolve it before persisting a canonical boolean/mode. It is not necessarily a database enum.

---

## 9. Historical / Comparative Reference Patterns

These are analyzer patterns, not automatically executable Monitoring configurations.

### Same period previous year

Text examples:

- `vs mismo período año anterior`
- `mismo mes del año pasado`
- `respecto al mismo trimestre del año anterior`

Proposal:

- Comparison Detected = YES
- Comparison Mode = `SAME_PERIOD_PREVIOUS_YEAR`

### Previous period

Text examples:

- `respecto al período anterior`
- `vs mes anterior`
- `comparado con trimestre anterior`

Proposal:

- Comparison Mode = `PREVIOUS_PERIOD`

### Custom period

Text examples:

- `vs 2022`
- `respecto a diciembre 2024`
- `comparado con enero-marzo 2025`

Proposal:

- Comparison Mode = `CUSTOM_PERIOD`

The Analyzer may detect custom historical intent without fully parsing arbitrary period ranges in V1.

### No explicit comparison

Text:

- `Vender 10 contenedores por mes`
- `Costo por km`
- `Cero accidentes`

Proposal:

- Comparison Mode = `NONE`

A future Configuration can still add a comparison if business rules permit it, but Definition Assist must not pretend it was explicit in the name.

---

## 10. Historical Mapping Rules

Historical reuse is a later runtime/configuration concern.

Conceptual rule:

`KPC-current` → approved historical equivalent → `KPC-historical`

Prefer:

1. SELF_HISTORY
2. MAPPED_KPI_CONFIGURATION approved by business
3. MANUAL baseline
4. BASELINE_MISSING

Do not map solely because:

- names are similar
- Family is the same
- Unit is compatible

Possible Existing KPI at Definition level is only a suggestion.

A historical mapping is a stronger business assertion and requires confirmation.

---

## 11. Scope vs Definition

Default rule:

**Same underlying business concept/formula + different operational scope → reuse Definition, specialize Configuration.**

Examples of scope:

- Puerto Cortés
- San Lorenzo
- Flota Nueva
- TRANEXPA
- IMPORT
- EXPORT
- customer
- shipping line
- company

Example:

`Productividad cabezales`

Configuration scope may specify:

- fleet
- company
- location
- target/goal
- unit details
- comparison mode

Do not create a new Definition merely because scope changes.

Exception:

If the scope materially changes the formula/business concept, evaluate whether another Definition is justified.

---

## 12. Excluded / Not Promoted

| Pattern | Reason |
|---|---|
| SCORE CARD Grupo EXA and equivalent rows | Linked Scorecard, not atomic KPI Definition knowledge. |
| Collaborator names | Scope/assignment metadata, not KPI definitions. |
| Historical Score / Nota / Weighted Value | Outcome/Scorecard data, not Definition Assist knowledge. |
| Excel formulas/styles/colors | Workbook implementation detail. |
| `Productividad` alone | Too generic to promote as a trusted standalone Definition. |
| Productividad cabezales Flota Nueva as separate Definition | Prefer shared productivity Definition with Flota Nueva as Configuration scope when the formula is the same. |
| Unit values `0`, `0.00`, blank, `#N/A` | Invalid/legacy placeholders, not real unit knowledge. |

---

## 13. Synthetic Reference Fixtures — NOT Historical Evidence

Useful to broaden analyzer tests. Do not present these as historical EXA workbook facts.

| Proposed KPI | Scope | Calculation Pattern | Family | Current Result | Unit | Behavior | Comparison Mode | Confirmation Note |
|---|---|---|---|---|---|---|---|---|
| Incrementar Gate In de contenedores | EXPORT | DIRECT | PRODUCTIVITY | Gate In containers | CONTAINERS | GREATER_IS_BETTER | NONE | EXPORT is scope, not a new calculation rule. |
| Incrementar contenedores movilizados | IMPORT | DIRECT | PRODUCTIVITY | Containers moved | CONTAINERS | GREATER_IS_BETTER | NONE | IMPORT is scope. |
| Incrementar contenedores movilizados | EXPORT | DIRECT | PRODUCTIVITY | Containers moved | CONTAINERS | GREATER_IS_BETTER | NONE | EXPORT is scope. |
| Reducir tiempo promedio de retiro | IMPORT | DERIVED | TIME | Total hours / containers retrieved | HOURS/CONTAINER | LOWER_IS_BETTER | NONE | Define official start/end timestamps. |
| Aumentar retiros dentro del tiempo objetivo | IMPORT | DERIVED | COMPLIANCE | On-time / total × 100 | % | GREATER_IS_BETTER | NONE | SLA threshold belongs to Configuration. |
| Aumentar exportaciones procesadas a tiempo | EXPORT | DERIVED | COMPLIANCE | On-time / total × 100 | % | GREATER_IS_BETTER | NONE | SLA threshold belongs to Configuration. |
| Reducir operaciones con incidencias | IMPORT / EXPORT | DERIVED | QUALITY | Operations with incidents / total × 100 | % | LOWER_IS_BETTER | NONE | May be COUNT if business explicitly chooses event count. |
| Aumentar galones de combustible despachados | LA MEGA / FUEL | DIRECT | SALES | Gallons dispatched | GALLONS | GREATER_IS_BETTER | NONE | Synthetic fixture. |
| Aumentar órdenes de combustible atendidas | LA MEGA / FUEL | DIRECT | PRODUCTIVITY | Orders completed | ORDERS | GREATER_IS_BETTER | NONE | Synthetic operational-volume fixture. |
| Aumentar porcentaje de órdenes completadas | LA MEGA / FUEL | DERIVED | COMPLIANCE | Completed / total × 100 | % | GREATER_IS_BETTER | NONE | Synthetic compliance fixture. |
| Aumentar ventas 10% vs mismo período año anterior | SALES | DIRECT | SALES | Current sales | USD | GREATER_IS_BETTER | SAME_PERIOD_PREVIOUS_YEAR | Comparison is independent of DIRECT capture. |
| Reducir costo/km 5% respecto al período anterior | TRANSPORT | DIRECT / DERIVED | COST | Current cost/km | USD/KM | LOWER_IS_BETTER | PREVIOUS_PERIOD | Exact reduction target/scoring remains future runtime logic. |

---

## 14. Rules Learned From Examples

- `Cero [incidente/accidente/robo]` strongly suggests `ZERO_IS_BETTER + COUNT`.
- `Costo por X` strongly suggests `RATIO`; lower is often favorable when the Result is the current cost metric.
- `km/cabezal/mes`, `USD/contenedor`, `USD/genset`, `USD/order` are ratio-unit patterns.
- `# de viajes`, `# de fallas`, `# de notas de crédito`, `clientes`, `incidentes`, `órdenes` are count patterns.
- `Aumentar` is a direction hint, not enough to define Result Semantics or Comparison Mode.
- `Reducir` is a direction/business-intent hint, not enough to define how Result is reported.
- `vs año anterior`, `mismo período año anterior` and explicit baseline years are strong comparison signals.
- Historical comparison is independent of Calculation Pattern.
- A KPI may remain USD, gallons, KM or ratio while the system additionally derives a change percentage.
- ROA and D/E are derived business metrics first; comparison is a separate Configuration dimension.
- `MULTI_INPUT_CURRENT_PERIOD` is appropriate when several same-period measurements matter but there is no official final formula.
- `COMPOSITE` is reserved for an official formula/weighting model.
- Contribution margin and operating margin are derived; accounting scope remains a business decision.
- Scope variations do not automatically create new Definitions.

---

## 15. Explicit Non-Rules

- Do not turn every field in this Markdown into a database column.
- Do not persist Analyzer reasoning merely because it appears here.
- Do not force the user to accept a suggested/normalized KPI name.
- Do not assume `LOWER_IS_BETTER` only because the name contains `reducir`.
- Do not assume historical comparison only because the name says `aumentar`.
- Do not assume `RANGE` merely because the text contains `rango`, `90-110` or `±10%`.
- Do not assume `EQUAL_IS_BETTER` merely because the text contains `mantener`.
- Do not infer units from `0`, `0.00`, blank cells or `#N/A`.
- Do not treat Linked Scorecards, collaborator names or administrative rows as atomic KPIs.
- Do not merge KPIs only because they contain similar words such as `margen`, `productividad`, `costo` or `ventas`.
- Do not approve a proposal solely because confidence is HIGH.
- Do not invent weights for Clima Laboral or Satisfacción al Cliente.
- Do not equate `Interno/Externo` with `Import/Export`.
- Do not create separate Productividad de cabezales Definitions only because fleet/scope changes.
- Do not use `Achieved Change / Target Change` as official Compliance for the currently confirmed comparative model.
- Do not invent scoring formulas for Behaviors that remain open.

---

## 16. Suggested Analyzer Questions

Questions should be business-friendly. Do not expose technical enums when a simpler question can resolve the ambiguity.

1. **¿Qué valor real se reportará como Result en cada período?**
2. **¿El Result es un valor observado directamente o se calcula con una fórmula?**
3. **¿Cuál es la unidad real del Result?**
4. **¿Este KPI debe compararse contra otro período/referencia?**
5. **Si compara, ¿contra el período anterior, el mismo período del año anterior o un período específico?**
6. **¿El porcentaje escrito es la meta absoluta o un cambio deseado respecto a un baseline?**
7. **¿“Reducir” significa reportar el valor actual o reportar directamente la reducción lograda?**
8. **¿La ubicación/flota/operación cambia el KPI o solo su scope?**
9. **Si existen varios inputs, ¿hay una fórmula oficial que produzca un solo Result?**
10. **Para márgenes financieros, ¿qué ingresos/costos forman parte oficialmente del cálculo?**
11. **Si el KPI usa un rango, ¿ese rango corresponde al Result, al Goal o a otra regla de evaluación?**
12. **Si dice “mantener”, ¿significa no exceder un límite o permanecer cerca de un objetivo con tolerancia?**

---

## 17. Analyzer Output vs Persistence

The Analyzer may return ephemeral proposal fields such as:

- normalizedName suggestion
- family proposal
- family confidence
- behavior proposal
- behavior confidence
- result semantics proposal
- semantics confidence
- calculation pattern proposal
- comparison detected
- comparison mode proposal
- comparison direction proposal
- unit hint
- cadence hint
- missing concepts
- requires confirmation
- suggested questions
- possible existing KPI
- rule version

These fields do **not** automatically require database columns.

Persist only the final business decisions needed for an executable KPI Configuration.

Monitoring should receive final frozen operational settings, not analyzer reasoning.

---

## 18. Downstream Responsibility Boundary

Conceptual flow:

`KPI Definition`
→ `KPI Configuration`
→ `KPI Pool`
→ `Scorecard`
→ `FINALIZED`
→ `Frozen Snapshot`
→ `Monitoring Results`
→ `CLOSED`
→ `Reports`

### KPI Definition
Owns conceptual identity and user-authored naming.

### KPI Configuration
Owns operational defaults such as:

- Behavior
- Measurement Unit
- Result Semantics
- Input Frequency
- Calculation Pattern
- Goal
- Comparison Mode
- approved evaluation rules

### KPI Pool
May contextualize allowed values such as Goal and Comparison Mode for a specific Pool/Input Period.

### Scorecard FINALIZED
Freezes the exact effective operational values.

Changes after FINALIZED must not mutate the historical composition.

### Monitoring
Owns:

- Current Results
- baseline resolution
- baseline provenance
- derived comparison values
- Compliance
- Goal Met
- validation/workflow
- closure

Monitoring must never classify the KPI name.

### CLOSED
Preserves the evaluated historical state and baseline actually used.

### Reports
Reads frozen historical truth. Reports must not recalculate historical results using current configuration.

---

## 19. Baseline / Refresh Invariants

- Missing baseline ≠ 0.
- Baseline 0 as a denominator is an invalid-baseline case, not missing.
- Prefer SELF_HISTORY when valid.
- MAPPED_KPI_CONFIGURATION must be business-approved.
- MANUAL is fallback.
- Refresh must not silently replace a manual baseline.
- While Monitoring is open, a corrected source result may require reevaluation; exact workflow remains open.
- CLOSED periods must not silently recalculate after upstream corrections.

---

## 20. Deliberately Open Decisions

Do not infer or implement these from this reference alone:

- exact `LOWER_IS_BETTER` scoring/compliance
- exact `ZERO_IS_BETTER` scoring/compliance
- `RANGE`
- `EQUAL_IS_BETTER`
- `BINARY`
- `MILESTONE`
- reduction target formula
- internal representation/sign of percentage Goal
- zero/negative baseline, target and current-result rules
- Compliance caps
- Traffic Light calculation
- rounding/scale
- permissions for manual baseline
- physical audit model
- physical historical mapping model
- physical Pool Override model
- physical Frozen Snapshot structure
- tables / columns / relations
- Prisma schema / migrations
- API endpoints / DTOs
- event/synchronization strategy
- exact CUSTOM_PERIOD aggregation semantics
- MULTI_INPUT execution when no final formula exists
- COMPOSITE component/weight model
- workflow behavior when baseline Refresh changes an open SUBMITTED/VALIDATED evaluation

Detectable does not mean executable.

---

## 21. Definition Assist Acceptance Examples

### A. Direct current value

**Input:** `Vender 10 contenedores por mes`

Expected:

- Status: GOOD
- Family: SALES
- Calculation Pattern: DIRECT
- Behavior: GREATER_IS_BETTER
- Result Semantics: COUNT
- Comparison Mode: NONE
- Cadence Hint: MONTHLY

### B. Ambiguous reduction

**Input:** `Reducir gasto administrativo 10%`

Expected:

- Status: NEEDS_CONFIRMATION
- Family: COST
- Do not force Behavior
- Do not force Result Semantics
- Comparison Mode unresolved
- Ask what Result represents and whether a baseline applies

### C. Same period previous year

**Input:** `Aumentar ventas 10% respecto al mismo período del año anterior`

Expected:

- Status: GOOD or NEEDS_CONFIRMATION depending unit/scope detail
- Calculation Pattern: DIRECT
- Behavior: GREATER_IS_BETTER
- Current Result Semantics: ABSOLUTE_VALUE when sales are captured in currency
- Comparison Detected: YES
- Comparison Mode: SAME_PERIOD_PREVIOUS_YEAR
- Comparison Direction: INCREASE

### D. Previous period cost reduction

**Input:** `Reducir costo por km 5% respecto al período anterior`

Expected:

- Calculation Pattern: DIRECT or DERIVED depending whether cost/km is provided or calculated
- Family: COST
- Behavior: LOWER_IS_BETTER
- Result Semantics: RATIO
- Comparison Detected: YES
- Comparison Mode: PREVIOUS_PERIOD
- Comparison Direction: REDUCTION
- Do not implement comparative LOWER scoring from this reference

### E. Custom historical period

**Input:** `Aumentar ventas 10% vs 2022`

Expected:

- Calculation Pattern: DIRECT
- Family: SALES
- Behavior: GREATER_IS_BETTER
- Result Semantics: ABSOLUTE_VALUE
- Comparison Detected: YES
- Comparison Mode: CUSTOM_PERIOD
- Comparison Direction: INCREASE
- Ask for exact reference interpretation if cadence makes `2022` ambiguous

### F. Derived metric with optional comparison

**Input:** `Aumentar ROA`

Expected:

- Calculation Pattern: DERIVED
- Family: FINANCE
- Behavior: GREATER_IS_BETTER
- Result Semantics: PERCENTAGE
- Comparison Mode: NONE unless comparison is explicitly requested/configured

### G. Zero-event KPI

**Input:** `Cero accidentes`

Expected:

- Calculation Pattern: DIRECT
- Family: INCIDENTS
- Behavior: ZERO_IS_BETTER
- Result Semantics: COUNT
- Comparison Mode: NONE

### H. Range wording ambiguity

**Input:** `Aumentar kms clientes (Rango 110-90)`

Expected:

- NEEDS_CONFIRMATION
- Do not force RANGE
- Ask what the range represents

---

## 22. Data Quality Notes

- Historical weights are not Definition Assist knowledge.
- Repeated monthly blocks do not create new references.
- Historical unit metadata can be wrong even when Behavior is clear.
- `0`, `0.00`, blank or `#N/A` unit metadata must not become rules.
- Historical scores and notes can be useful for archaeology but should not be propagated to Monitoring contracts.
- Parent/child project lists may represent sub-items of one KPI.
- Ambiguous rows are valuable fixtures because they teach the Analyzer when **not** to auto-confirm.

---

## 23. v5 Change Log

v5 corrects conceptual inconsistencies from v4:

1. Removed `COMPARISON` from Calculation Pattern.
2. Calculation Pattern now only describes how Current Result is obtained:
   - DIRECT
   - DERIVED
   - MULTI_INPUT_CURRENT_PERIOD
   - COMPOSITE
3. Replaced `Comparison Basis = CURRENT_PERIOD` with `Comparison Mode = NONE`.
4. Canonical Comparison Modes are now:
   - NONE
   - PREVIOUS_PERIOD
   - SAME_PERIOD_PREVIOUS_YEAR
   - CUSTOM_PERIOD
5. Behavior explicitly describes the favorable direction of the business metric.
6. Comparison Direction is kept separately as INCREASE / REDUCTION.
7. Historical comparison no longer automatically changes Current Result Semantics to CHANGE_PERCENT.
8. Comparative sales can remain ABSOLUTE_VALUE in USD while the system separately derives change %.
9. `Reducir gasto administrativo 10%` is moved to an explicit NEEDS_CONFIRMATION pattern.
10. `Aumentar ventas 10%` is not considered complete until the meaning of the 10% is clear.
11. Added baseline-resolution priority:
    SELF_HISTORY → approved MAPPED_KPI_CONFIGURATION → MANUAL → BASELINE_MISSING.
12. Clarified that historical mapping is primarily Configuration-to-Configuration.
13. Clarified that Refresh must not silently replace manual baselines.
14. Clarified that CLOSED historical evaluations preserve baseline/provenance.
15. Added confirmed GREATER comparative Compliance example using Current Result / Target Value.
16. Explicitly leaves LOWER/ZERO/RANGE/EQUAL/BINARY/MILESTONE scoring open.
17. Explicitly leaves target-reduction formula, rounding, caps, Traffic Lights and physical persistence open.
18. Expanded Definition Assist acceptance fixtures for DIRECT, DERIVED and historical-comparison detection.
19. Reaffirmed that Analyzer outputs are not database-schema requirements.
20. Reaffirmed the architecture:
    Definition → Configuration → Pool → Scorecard FINALIZED → Frozen Snapshot → Monitoring → Reports.

---

## 24. Final Principle

> **Definition Assist understands and asks.**
>
> **KPI Configuration decides and approves.**
>
> **Pool contextualizes.**
>
> **Scorecard FINALIZED freezes.**
>
> **Monitoring executes and preserves.**
>
> **Reports observes.**

This reference should be used to generalize deterministic rules and tests.

Do not implement exact-name hardcodes from historical KPI rows.
