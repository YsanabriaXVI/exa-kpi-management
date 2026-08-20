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
};

const dateOnly = (value: Date) => value.toISOString().slice(0, 10);

export function toKpiPoolDto(pool: PoolRecord) {
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const countDate = today < pool.validFrom ? pool.validFrom : today > pool.validTo ? pool.validTo : today;
  const effectiveKpiCount = pool.kpis?.filter((membership) => membership.effectiveFrom <= countDate && (membership.effectiveTo === null || membership.effectiveTo >= countDate)).length;
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
    createdAt: pool.createdAt.toISOString(),
    updatedAt: pool.updatedAt?.toISOString() ?? null,
  };
}
