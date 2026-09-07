1. Backend Foundation       ← AHORA ✅✅
2. Autosuggest backend  ✅✅
3. Analyzer + AutoClassifier backend ✅✅
4. Frontend Definition Assist  -- now ✅✅✅
5. Result Setup / preguntas    ✅✅
6. Executable KPI Configuration ✅✅
7. Pool Effective Settings    ✅✅
8. FINALIZED Snapshot         ✅✅
9. Monitoring hardening       ✅✅
10. Manual Result Entry       ✅✅
11. Check Results           !! Aquí vamos  (pensar en los baselines de otros periodos) ✅✅☠️☠️☠️☠️
12. Workflow completo  
13. Next Period
14. Excel
15. Historical Comparison
16. Reports



--- terminar con esto: 
 
y tambien tener para modificar las Measurement Units, Data Sources tambien  ✅



Sí. Esta pantalla ya se volvió **muy importante**, porque `BY_ENTITY` depende completamente de que exista un catálogo confiable de: ✅

```text
Subject Type
        ↓
Subject Values
```

Yo la pondría en **KPI Management**, porque ahí se configura la estructura reutilizable que después consumen KPI Config, Pool y finalmente Scorecards.

Podría llamarse:

```text
Subject Catalog
```

Y tendría dos niveles.

### 1. Subject Types

```text
Subject Catalog
──────────────────────────────────────────

Code        Name            Status     Values
EMPLOYEE    Employee        Active       35
CUSTOMER    Customer        Active       18
FLEET       Fleet           Active        7
LOCATION    Location        Active        5
ASSET       Asset           Active        9
OPERATION   Operation       Active        6

[ + Add Subject Type ]
```

Acciones:

```text
View Values
Edit
Activate / Deactivate
```

Yo **no permitiría Delete físico**.

---

### 2. Values de un Subject Type

Entras por ejemplo a:

```text
CUSTOMER — Customer
```

y ves:

```text
Subject Values
──────────────────────────────────────────

Code        Name             Status
CUS-001     Cliente A        Active
CUS-002     Cliente B        Active
CUS-003     Cliente C        Active
CUS-004     Cliente D        Inactive

[ + Add Customer ]
```

Lo mismo para:

```text
FLEET
→ Flota Nueva
→ TRANEXPA
→ IPH

LOCATION
→ Puerto Cortés
→ San Lorenzo
→ Predio

ASSET
→ Cabezales
→ Gensets
→ Contenedores
→ Equipos
```

Y entonces el `Set KPI Config` deja de tener valores improvisados. Hace:

```text
Subject Type
[ Customer ▼ ]

          ↓

GET active values for CUSTOMER

          ↓

Entities
[ Cliente A × ][ Cliente B × ][ Cliente C × ]
```

## Lo más importante: históricos

Aquí pondría una regla fuerte:

> **Subject Types y Subject Values utilizados históricamente nunca se eliminan físicamente.**

Si alguien “borra” Cliente B:

```text
CUS-002 Cliente B
Active → Inactive
```

Entonces:

* ya no aparece para nuevas configuraciones;
* configuraciones existentes siguen pudiendo mostrarlo;
* Scorecards FINALIZED siguen teniendo su snapshot;
* Monitoring histórico sigue mostrando `Cliente B`;
* Reports históricos siguen funcionando.

Y si cambian el nombre:

```text
Cliente B
→ Cliente Corporativo B
```

el `id/code` permanece igual.

Por ejemplo:

```text
id = 27
code = CUS-002
```

nunca cambia.

Las composiciones futuras pueden ver:

```text
Cliente Corporativo B
```

pero un Scorecard que fue FINALIZED antes puede seguir mostrando el label congelado:

```text
Cliente B
```

porque FINALIZED ya guarda:

```text
subjectExternalId
subjectCode
subjectLabelSnapshot
```

Eso protege la historia.

---

### Modelo mínimo

Yo empezaría con algo sencillo:

```text
subject_types
──────────────
id
code
name
is_active
created_at
updated_at
deleted_at


subject_values
──────────────
id
subject_type_id
code
name
is_active
created_at
updated_at
deleted_at
```

Y quizá auditoría si ya tienen un patrón existente.

No metería todavía:

```text
dynamic JSON metadata
nested hierarchies
parent/children
custom columns
external integrations
```

Eso después.

## Otra regla importante

Si un `Subject Value` está usado por una KPI Configuration activa, yo no impediría necesariamente desactivarlo, pero sí mostraría una advertencia:

```text
Deactivate "Cliente B"?

This value is currently referenced by:
3 KPI Configurations
2 active Pools

Existing and historical references will remain unchanged.
It will no longer be available for new selections.
```

Eso está muy bien para administración.

Y conceptualmente el flujo queda precioso:

```text
SUBJECT CATALOG
Define qué entidades existen
        ↓
KPI CONFIG
Selecciona cuáles participan
y establece sus Goals
        ↓
POOL
Contextualiza
        ↓
FINALIZED
Congela IDs + labels + Goals
        ↓
MONITORING
Captura un Result por entidad congelada
```

Sí: yo consideraría esta pantalla casi **obligatoria** si `BY_ENTITY` va a ser una capability importante del sistema. Así evitas hardcodes y, sobre todo, proteges el histórico correctamente.








 creo que al escoger Goals by Entity / Subject digamos que los resultados los vamos a obtener de forma cuantitiva (el ejemplo claro de los kilometros
  recorridos) , pero digamos que la meta es +10% (escogemos unidad de medida para la meta), pero a cada entidad: digamos colaboradores y caracteristicas) es
  mejor OK. unidad de medida es units, pero en la meta en lugar de poner un valor cuantitativo, es mejor tener un checkbox alineado con la meta a nivel grupal
  y la otra (si se quiere es una meta a nivel personal) con esa entidad? me entiendes?


• Sí, te entiendo. El punto clave es separar tres cosas que hoy pueden confundirse:

  1. Qué resultado capturamos: cantidad de kilómetros, procesos, unidades, etc.
  2. Cómo expresamos la meta: +10% respecto al período anterior.
  3. Dónde evaluamos la meta: a nivel grupal o por cada entidad.

  La unidad del resultado seguiría siendo cuantitativa: km, units, processes. El +10% no debería convertirse en la Measurement Unit; sería el tipo de meta.

  Yo no pondría un checkbox independiente en cada fila. Pondría una decisión principal:

  ### Goal applies to

  - Group total
  - Each entity

  ## Opción 1: Group total

  Se seleccionan los colaboradores que forman el grupo y se evalúa el total combinado.

  Ejemplo:

  - Unidad: km
  - Comparación: Previous period
  - Meta grupal: +10%
  - Resultado anterior del grupo: 1,000 km
  - Resultado actual: 1,150 km
  - Cambio: +15%
  - Estado: Achieved

  En esta modalidad, las entidades sirven para definir quién pertenece al grupo, pero no tienen una meta individual.

  La interfaz mostraría:

  Goal applies to:  ● Group total   ○ Each entity
  Target change:     +10%
  Measurement Unit:  km
  Group members:     12 collaborators selected

  ## Opción 2: Each entity

  Cada colaborador se evalúa contra su propio período anterior.

  Goal applies to:  ○ Group total   ● Each entity
  Default target:    +10%
  Measurement Unit:  km

   Collaborator    Previous period    Personal target    Required result
  ━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━
   Ana                       36 km               +10%            39.6 km
  ──────────────  ─────────────────  ─────────────────  ─────────────────
   Luis                      50 km               +15%            57.5 km
  ──────────────  ─────────────────  ─────────────────  ─────────────────
   Marta                     42 km               +10%            46.2 km

  Aquí tendría sentido permitir:

  - Una meta general de +10%.
  - Un checkbox Use group target por entidad.
  - Si se desmarca, aparece una meta personal editable.

  Así el checkbox de cada fila significaría realmente:

  > Esta entidad hereda la meta grupal.

  No significaría que la entidad pertenece al grupo, porque esa selección debe hacerse antes.

  ## Estructura recomendada

  Dentro de Goals by Entity / Subject:

  1. Subject Type: Collaborator.
  2. Select entities: colaboradores incluidos.
  3. Goal applies to: Group total / Each entity.
  4. Result Measurement Unit: km, processes, units, etc.
  5. Goal expression: Absolute value / Increase % / Reduction %.
  6. Target: +10%.
  7. Si seleccionas Each entity, mostrar tabla con herencia y overrides personales.

  Mi recomendación final:

  - Para Group total, una sola meta y evaluación agregada.
  - Para Each entity, meta general heredable más excepciones personales.
  - El checkbox por entidad debería llamarse Use group target.
  - Measurement Unit describe el resultado real (km), nunca el porcentaje de crecimiento.

  También hay que congelar la composición del grupo por período. Si alguien entra o sale durante el siguiente período, comparar totales sin conservar los mismos
  integrantes podría producir un crecimiento engañoso.