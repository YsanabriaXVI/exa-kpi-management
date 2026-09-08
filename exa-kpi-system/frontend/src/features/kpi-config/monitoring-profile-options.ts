import type { ExplainedOption } from "./ExplainedSelect";

export const behaviorOptions: ExplainedOption[] = [
  { value: "HIGHER_IS_BETTER", label: "Más es mejor", meaning: "Buscas aumentar una cantidad. Un resultado mayor representa un mejor desempeño.", example: "Ventas: meta de 100,000 USD y resultado de 90,000 USD → cumplimiento proporcional del 90%." },
  { value: "LOWER_IS_BETTER", label: "Menos es mejor", meaning: "Buscas reducir una cantidad, como costos, tiempos o incidencias.", example: "Costo: meta de 100 USD y resultado de 125 USD → 100 ÷ 125 × 100 = 80% de cumplimiento." },
  { value: "ZERO_IS_BETTER", label: "Lo ideal es cero", meaning: "Buscas eliminar eventos. Debes definir cuánto cumplimiento corresponde a cada rango de resultados.", example: "Accidentes: capturas 1. Una regla podría asignar 100% a cero accidentes, 70% a uno y 0% a dos o más.", note: "Los porcentajes del ejemplo son ilustrativos. Tu organización debe confirmar los rangos y sus puntuaciones." },
];
export const semanticsOptions: ExplainedOption[] = [
  { value: "ABSOLUTE_VALUE", label: "Cantidad medida", meaning: "Magnitud cuantitativa medida.", example: "3,500 km, 500 galones, 1,200 contenedores.", note: "Si la meta es aumentar ventas 10% respecto al histórico, capturas las ventas actuales en USD. Monitoring obtiene el cambio porcentual." },
  { value: "UNIT_COST", label: "Costo por unidad", meaning: "Dinero dividido por alguna unidad.", example: "$2.50/km, $18/contenedor." },
  { value: "COUNT", label: "Conteo", meaning: "Número discreto de elementos o eventos.", example: "0 incidentes, 45 reclamos, 200 órdenes." },
  { value: "CHANGE_PERCENT", label: "Cambio porcentual", meaning: "El resultado ya es una variación porcentual.", example: "+12%, -8%.", note: "En una comparación histórica de ventas en USD, captura el importe actual; Monitoring deriva el cambio con la referencia histórica." },
  { value: "COMPLIANCE_PERCENT", label: "Porcentaje de cumplimiento", meaning: "El resultado mismo es un porcentaje.", example: "94% de entregas on-time." },
  { value: "RATIO", label: "Razón expresada en porcentaje", meaning: "Capturas directamente el porcentaje final, calculado previamente. No necesitas registrar numerador ni denominador.", example: "Aumentar ROA 5% o disminuir D/E 10%. Captura el porcentaje final del indicador en Monitoring.", note: "La unidad del resultado es %. Expresa también la meta en porcentaje: 25 significa 25%, no 0.25." },
  { value: "DURATION", label: "Duración", meaning: "Tiempo transcurrido.", example: "3.5 días, 45 minutos." },
  { value: "BINARY", label: "Sí / No", meaning: "Resultado binario.", example: "Auditoría completada: Sí/No.", note: "Sí asigna 100% de cumplimiento y No asigna 0%. Traffic Light clasifica ese cumplimiento." },
  { value: "DERIVED_PERCENTAGE", label: "Porcentaje calculado", meaning: "Un porcentaje obtenido mediante una operación previa.", example: "8 productos defectuosos ÷ 200 productos × 100 = 4%.", note: "Actualmente capturas el porcentaje final. Monitoring no solicita ni calcula sus componentes automáticamente." },
];
export const directionOptions: ExplainedOption[] = [
  { value: "CLOSER_TO_ZERO", label: "Más cercano a cero", meaning: "Buscas llegar a cero usando valores enteros no negativos: 0, 1, 2, 3... Cuanto menor es el resultado, mejor es el cumplimiento.", example: "Incidentes: 0 = 100%, 1 = 70%, 2 = 50%, 3 o más = 0%, según las bandas configuradas.", note: "Se evalúa el resultado del periodo con meta cero, no un porcentaje de cambio histórico. No se permiten negativos." },
  { value: "LOWER_WITH_REDUCTION", label: "Menos es mejor + Reducción", meaning: "Buscas reducir el resultado respecto a un periodo histórico. Se selecciona Menos es mejor y el cambio esperado es Reducción.", example: "Costo anterior: 4 USD por contenedor. Meta: reducir 25%. Resultado actual: 3 USD por contenedor. La reducción lograda es 25%, equivalente al 100% de la meta.", note: "Requiere una referencia histórica. Capturas el costo actual; las bandas evalúan el porcentaje de reducción logrado. Una reducción mayor es mejor. Para una meta absoluta de 2.50 USD, utiliza Menos es mejor." },
  { value: "INCREASE", label: "Aumento", meaning: "Esperas que el resultado actual supere al del periodo de referencia.", example: "Antes: 100,000 USD. Capturas ahora: 115,000 USD → aumento del 15%.", note: "Con una meta de aumento del 10%, el cumplimiento bruto es 150%. Si el máximo configurado es 100%, queda en 100%." },
  { value: "REDUCTION", label: "Reducción", meaning: "Esperas que el resultado actual sea menor al del periodo de referencia.", example: "Antes: 100,000 USD de costos. Capturas ahora: 85,000 USD → reducción del 15%." },
];
export const negativeOptions: ExplainedOption[] = [
  { value: "DISALLOW", label: "No se permiten", meaning: "El cálculo se bloquea si el resultado capturado es negativo.", example: "−3 accidentes no es un conteo válido." },
  { value: "ALLOW", label: "Se permiten", meaning: "Un resultado negativo puede pasar a la regla de scoring. No garantiza un cumplimiento positivo.", example: "Una utilidad de −5000 USD puede representar pérdidas." },
  { value: "REVIEW", label: "Requieren revisión", meaning: "El cálculo se bloquea y señala que el valor negativo necesita revisión.", example: "Ventas netas de −2000 USD por devoluciones extraordinarias.", note: "Actualmente genera un bloqueo que debe resolverse; no abre una aprobación especial." },
];
