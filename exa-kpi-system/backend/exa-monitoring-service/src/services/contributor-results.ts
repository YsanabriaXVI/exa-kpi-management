import { Prisma } from "@prisma/client";
import { contributionContractError } from "../contracts/entity-participation.js";

export type ContributorValue = { subjectType: string; subjectExternalId: string; resultValue: string | null };
// 500 inputs of Decimal(20,6) fit exactly at this precision, including intermediate sums.
const SumDecimal = Prisma.Decimal.clone({ precision: 30 });
export function sumContributorResults(settings: any, values: ContributorValue[] | undefined) {
  const contractError = contributionContractError(settings);
  if (contractError) return { value: null, values: [], errorCode: contractError };
  const subjects: Array<{ subjectExternalId: string }> = settings.subjects;
  if (values === undefined) values = subjects.map(subject => ({ subjectType: settings.subjectType, subjectExternalId: subject.subjectExternalId, resultValue: null }));
  if (!Array.isArray(values) || values.length !== subjects.length
    || new Set(values.map(v => v.subjectExternalId)).size !== subjects.length
    || values.some(v => v.subjectType !== settings.subjectType || !subjects.some(s => s.subjectExternalId === v.subjectExternalId)))
    return { value: null, values: [], errorCode: "CONTRIBUTOR_INPUTS_INVALID" };
  const ordered = subjects.map(s => values.find(v => v.subjectExternalId === s.subjectExternalId)!);
  if (ordered.some(v => v.resultValue !== null && !/^-?\d{1,14}(?:\.\d{1,6})?$/.test(v.resultValue)))
    return { value: null, values: ordered, errorCode: "RESULT_PRECISION_EXCEEDED" };
  for (const item of ordered) {
    if (item.resultValue === null) continue;
    const value = new SumDecimal(item.resultValue);
    if (settings.resultSemantics === "COUNT" && (!value.isInteger() || value.lt(0)))
      return { value: null, values: ordered, errorCode: "COUNT_RESULT_INVALID" };
    if (value.lt(0) && settings.negativeResultPolicy !== "ALLOW")
      return { value: null, values: ordered, errorCode: settings.negativeResultPolicy === "REVIEW" ? "NEGATIVE_RESULT_REQUIRES_REVIEW" : "NEGATIVE_RESULT_NOT_ALLOWED" };
  }
  if (ordered.some(v => v.resultValue === null)) return { value: null, values: ordered, errorCode: "CONTRIBUTOR_RESULT_MISSING" };
  const total = ordered.reduce((sum, v) => sum.plus(v.resultValue!), new SumDecimal(0));
  if (total.abs().gte("100000000000000")) return { value: null, values: ordered, errorCode: "RESULT_PRECISION_EXCEEDED" };
  return { value: new Prisma.Decimal(total.toFixed(6)), values: ordered, errorCode: null };
}
