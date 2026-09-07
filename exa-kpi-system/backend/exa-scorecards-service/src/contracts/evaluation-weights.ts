import { Prisma } from "@prisma/client";
import { AppError } from "../utils/app-error.js";
import { freezeEffectiveKpiSettings, type EffectiveKpiSettingsV1 } from "./frozen-effective-kpi-settings.js";

export type EntityWeight = { subjectExternalId: string; weight: string | number | null };
export function freezeWeightedSettings(settings: EffectiveKpiSettingsV1, entries: EntityWeight[]) {
  const frozen = structuredClone(freezeEffectiveKpiSettings(settings));
  if (settings.evaluationScope === "BY_SUBJECT") Object.assign(frozen, {
    evaluationWeightsVersion: "EXPLICIT_ENTITY_V1",
    subjectGoals: entityWeights(settings, entries),
  });
  return frozen;
}
export function entityWeights(settings: EffectiveKpiSettingsV1, entries: EntityWeight[], requireComplete = true) {
  const ids = settings.subjectGoals.map(subject => subject.subjectExternalId);
  if (!ids.length || new Set(ids).size !== ids.length || new Set(entries.map(entry => entry.subjectExternalId)).size !== entries.length)
    throw new AppError(422, "SCORECARD_ENTITY_DUPLICATE", "Entity evaluations must be unique and nonempty");
  if (entries.some(entry => !ids.includes(entry.subjectExternalId)))
    throw new AppError(422, "SCORECARD_ENTITY_NOT_FOUND", "An entity weight targets an entity outside the effective configuration");
  return settings.subjectGoals.map(subject => {
    const entry = entries.find(item => item.subjectExternalId === subject.subjectExternalId);
    if (entry?.weight === null || entry?.weight === undefined) {
      if (requireComplete) throw new AppError(422, "SCORECARD_ENTITY_WEIGHT_MISSING", `Enter an explicit weight for ${subject.subjectLabel}`);
      return { ...subject, weight: null };
    }
    const weight = new Prisma.Decimal(entry.weight);
    if (!weight.isFinite() || weight.lt(0) || weight.gt(100) || weight.decimalPlaces() > 4)
      throw new AppError(422, "SCORECARD_ENTITY_WEIGHT_INVALID", "Entity weights must be between 0 and 100 with at most four decimal places");
    return { ...subject, weight: weight.toFixed(4) };
  });
}
