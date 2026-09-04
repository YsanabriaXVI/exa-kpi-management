1. Backend Foundation       ← AHORA ✅✅
2. Autosuggest backend  ✅✅
3. Analyzer + AutoClassifier backend ✅✅
4. Frontend Definition Assist  -- now ✅✅✅
5. Result Setup / preguntas    ✅✅
6. Executable KPI Configuration ⚠️⚠️
7. Pool Effective Settings    ⚠️⚠️
8. FINALIZED Snapshot         ⚠️⚠️
9. Monitoring hardening        ⚠️⚠️
10. Manual Result Entry
11. Check Results
12. Workflow completo
13. Next Period
14. Excel
15. Historical Comparison
16. Reports



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