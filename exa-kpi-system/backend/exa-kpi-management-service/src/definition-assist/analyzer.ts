import { detectDefinitionSignals } from "./rules.js";
import { DEFINITION_ASSIST_RULE_VERSION, type DefinitionSignals, type MissingConfigurationConcept } from "./vocabulary.js";

export type DefinitionAnalysisResponse = Readonly<{
  ruleVersion: typeof DEFINITION_ASSIST_RULE_VERSION;
  analysisStatus: DefinitionSignals["status"];
  configurationReadiness: "READY" | "INCOMPLETE";
  missingConfigurationConcepts: readonly MissingConfigurationConcept[];
  originalName: string;
  normalizedName: string;
  family: DefinitionSignals["family"];
  behavior: DefinitionSignals["behavior"];
  resultSemantics: DefinitionSignals["resultSemantics"];
  calculationPattern: DefinitionSignals["calculationPattern"];
  comparison: Readonly<{
    detected: boolean;
    intent: DefinitionSignals["comparisonIntent"];
    mode: DefinitionSignals["comparisonMode"]["value"];
    direction: DefinitionSignals["comparisonDirection"]["value"];
  }>;
  resultUnitHint: string | null;
  cadenceHint: string | null;
  targetHint: DefinitionSignals["targetHint"];
  missingConcepts: DefinitionSignals["missingConcepts"];
  ambiguities: DefinitionSignals["ambiguities"];
  suggestedQuestions: DefinitionSignals["suggestedQuestions"];
}>;

/** Pure, deterministic analyzer. It performs no lookup, persistence, approval, or scoring. */
export function analyzeKpiDefinition(name: string): DefinitionAnalysisResponse {
  const signals = detectDefinitionSignals(name);
  const missingConfigurationConcepts: MissingConfigurationConcept[] = [];
  if (!signals.targetHint) missingConfigurationConcepts.push("GOAL");
  if (!signals.cadenceHint.value) missingConfigurationConcepts.push("CADENCE");
  if (!signals.unitHint.value) missingConfigurationConcepts.push("RESULT_UNIT");
  if (!signals.behavior.value) missingConfigurationConcepts.push("BEHAVIOR");
  if (!signals.resultSemantics.value) missingConfigurationConcepts.push("RESULT_SEMANTICS");
  if (!signals.calculationPattern.value) missingConfigurationConcepts.push("CALCULATION_PATTERN");
  if (signals.comparisonIntent === "POSSIBLE" && !signals.comparisonMode.value) missingConfigurationConcepts.push("COMPARISON_MODE");
  return {
    ruleVersion: DEFINITION_ASSIST_RULE_VERSION,
    analysisStatus: signals.status,
    configurationReadiness: missingConfigurationConcepts.length === 0 ? "READY" : "INCOMPLETE",
    missingConfigurationConcepts,
    originalName: signals.originalText,
    normalizedName: signals.normalizedText,
    family: signals.family,
    behavior: signals.behavior,
    resultSemantics: signals.resultSemantics,
    calculationPattern: signals.calculationPattern,
    comparison: {
      detected: signals.comparisonDetected,
      intent: signals.comparisonIntent,
      mode: signals.comparisonMode.value,
      direction: signals.comparisonDirection.value,
    },
    resultUnitHint: signals.unitHint.value,
    cadenceHint: signals.cadenceHint.value,
    targetHint: signals.targetHint,
    missingConcepts: signals.missingConcepts,
    ambiguities: signals.ambiguities,
    suggestedQuestions: signals.suggestedQuestions,
  };
}
