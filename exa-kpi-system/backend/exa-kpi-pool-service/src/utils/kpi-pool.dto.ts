type PoolRecord = {
  id: bigint;
  poolCode: string;
  poolName: string;
  description: string | null;
  notes: string | null;
  inputFrequencyExternalId: bigint;
  inputFrequencyCode: string;
  validFrom: Date;
  validTo: Date;
  issueYear: number;
  poolSequence: number;
  areaScopeKey: string;
  statusCode: string;
  createdAt: Date;
  updatedAt: Date | null;
  areas: Array<{ poolAreaId: bigint; displayOrder: number; areaCodeSnapshot: string; areaNameSnapshot: string }>;
  companies: Array<{ externalCompanyId: bigint; displayOrder: number; companyCodeSnapshot: string; companyNameSnapshot: string }>;
  kpis?: Array<{ effectiveFrom: Date; effectiveTo: Date | null }>;
  _count?: { kpis: number };
  inputPeriods?: Array<{ id: bigint; periodKey: string; periodStart: Date; periodEnd: Date }>;
  periodCompositions?: Array<{ id: bigint; inputPeriodId: bigint; periodStart: Date; periodEnd: Date; statusCode: string; kpiCountSnapshot: number }>;
};

const dateOnly = (value: Date) => value.toISOString().slice(0, 10);

export function toKpiPoolDto(pool: PoolRecord) {
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const countDate = today < pool.validFrom ? pool.validFrom : today > pool.validTo ? pool.validTo : today;
  const effectiveKpiCount = pool.kpis?.filter((membership) => membership.effectiveFrom <= countDate && (membership.effectiveTo === null || membership.effectiveTo >= countDate)).length;
  const periods = pool.inputPeriods ?? [];
  const compositions = pool.periodCompositions ?? [];
  const finalized = compositions.at(-1);
  const finalizedPeriod = finalized ? periods.find((period) => period.id === finalized.inputPeriodId) : undefined;
  const operationalPeriod = finalizedPeriod ?? periods[0];
  const nextPeriod = finalizedPeriod ? periods[periods.findIndex((period) => period.id === finalizedPeriod.id) + 1] : undefined;
  return {
    id: pool.id.toString(),
    poolCode: pool.poolCode,
    poolName: pool.poolName,
    description: pool.description,
    notes: pool.notes,
    status: pool.statusCode,
    issueYear: pool.issueYear,
    poolSequence: pool.poolSequence,
    areaScopeKey: pool.areaScopeKey,
    inputFrequency: { id: pool.inputFrequencyExternalId.toString(), code: pool.inputFrequencyCode },
    validFrom: dateOnly(pool.validFrom),
    validTo: dateOnly(pool.validTo),
    areas: pool.areas.map((area) => ({
      id: area.poolAreaId.toString(), code: area.areaCodeSnapshot, name: area.areaNameSnapshot, displayOrder: area.displayOrder,
    })),
    companies: pool.companies.map((company) => ({
      id: company.externalCompanyId.toString(), code: company.companyCodeSnapshot, name: company.companyNameSnapshot, displayOrder: company.displayOrder,
    })),
    kpiCount: effectiveKpiCount ?? pool._count?.kpis ?? 0,
    scorecardCount: 0,
    operationalPeriod: operationalPeriod ? {
      periodKey: operationalPeriod.periodKey,
      start: dateOnly(operationalPeriod.periodStart),
      end: dateOnly(operationalPeriod.periodEnd),
      status: finalizedPeriod ? "FINALIZED" : "PREPARING",
      kpiCount: finalized?.kpiCountSnapshot ?? null,
      next: nextPeriod ? { periodKey: nextPeriod.periodKey, start: dateOnly(nextPeriod.periodStart), status: "PREPARING" } : null,
    } : null,
    createdAt: pool.createdAt.toISOString(),
    updatedAt: pool.updatedAt?.toISOString() ?? null,
  };
}
