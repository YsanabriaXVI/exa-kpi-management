export type ScorecardStatus = "ACTIVE" | "DRAFT" | "EXPIRED";

export type ScorecardRecord = {
  id: number;
  code: string;
  name: string;
  departments: string[];
  durationMonths: number[];
  year: number;
  inputFrequency: string;
  kpis: number;
  linkedScorecards: number;
  poolSource: string;
  company: string;
  status: ScorecardStatus;
  collaborators: number;
};

export type ScorecardInput = Omit<ScorecardRecord, "id" | "code" | "kpis" | "linkedScorecards">;
