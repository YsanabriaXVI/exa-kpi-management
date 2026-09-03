import type { CalculationPattern, ComparisonMode, KpiBehavior, KpiFamily, ResultSemantics } from "../../definition-assist/vocabulary.js";

export type DefinitionAssistFixture = Readonly<{
  name: string;
  expected: Readonly<{
    family?: KpiFamily;
    calculationPattern?: CalculationPattern;
    behavior?: KpiBehavior;
    resultSemantics?: ResultSemantics;
    cadence?: string;
    comparisonDetected?: boolean;
    comparisonMode?: ComparisonMode;
  }>;
}>;

export const trustedDefinitionFixtures: readonly DefinitionAssistFixture[] = [
  { name: "Vender 10 contenedores por mes", expected: { family: "SALES", calculationPattern: "DIRECT", behavior: "GREATER_IS_BETTER", resultSemantics: "COUNT", cadence: "MONTHLY", comparisonDetected: false, comparisonMode: "NONE" } },
  { name: "Cero accidentes", expected: { family: "INCIDENTS", calculationPattern: "DIRECT", behavior: "ZERO_IS_BETTER", resultSemantics: "COUNT", comparisonDetected: false, comparisonMode: "NONE" } },
  { name: "Aumentar ROA", expected: { family: "FINANCE", calculationPattern: "DERIVED", behavior: "GREATER_IS_BETTER", resultSemantics: "PERCENTAGE", comparisonMode: "NONE" } },
  { name: "Aumentar ventas 10% respecto al mismo período del año anterior", expected: { family: "SALES", calculationPattern: "DIRECT", behavior: "GREATER_IS_BETTER", resultSemantics: "ABSOLUTE_VALUE", comparisonDetected: true, comparisonMode: "SAME_PERIOD_PREVIOUS_YEAR" } },
  { name: "Reducir costo por km 5% respecto al período anterior", expected: { family: "COST", behavior: "LOWER_IS_BETTER", resultSemantics: "RATIO", comparisonDetected: true, comparisonMode: "PREVIOUS_PERIOD" } },
  { name: "Incrementar gate out de contenedores", expected: { family: "PRODUCTIVITY", calculationPattern: "DIRECT", behavior: "GREATER_IS_BETTER", resultSemantics: "COUNT", comparisonMode: "NONE" } },
  { name: "Rotación de inventario", expected: { family: "INVENTORY", calculationPattern: "DERIVED", resultSemantics: "RATIO", comparisonMode: "NONE" } },
];

export const ambiguousDefinitionFixtures = [
  { name: "Reducir gasto administrativo 10%", ambiguity: "RESULT_REPORTING_MEANING" },
  { name: "Mantener costo/km", ambiguity: "MAINTAIN_MEANING" },
  { name: "Aumentar kms clientes (Rango 110-90)", ambiguity: "RANGE_MEANING" },
  { name: "Aumentar ventas 10%", ambiguity: "COMPARISON_REFERENCE" },
] as const;
