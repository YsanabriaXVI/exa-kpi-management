import type { ScorecardInput, ScorecardRecord } from "./scorecard.types";

let scorecards: ScorecardRecord[] = [
  { id: 1, code: "SCD-0111", name: "Grupo EXA - CONMOXA ScoreCard", departments: ["Administration", "Operations"], durationMonths: [0,1,2,3,4,5], year: 2026, inputFrequency: "Monthly", kpis: 8, linkedScorecards: 3, poolSource: "Grupo EXA KPI Pool", company: "Grupo EXA", status: "ACTIVE", collaborators: 18 },
  { id: 2, code: "SCD-0112", name: "AXA Monthly ScoreCard", departments: ["Process"], durationMonths: [0,1,2,3,4,5,6,7,8,9,10,11], year: 2024, inputFrequency: "Monthly", kpis: 5, linkedScorecards: 2, poolSource: "AXA Monthly KPI Pool", company: "AXA", status: "EXPIRED", collaborators: 9 },
  { id: 3, code: "SCD-0113", name: "EXA Financial ScoreCard", departments: ["Innovation", "Finance"], durationMonths: [0,1,2,3,4,5], year: 2026, inputFrequency: "Quarterly", kpis: 6, linkedScorecards: 4, poolSource: "Financial KPI Pool", company: "EXA", status: "ACTIVE", collaborators: 12 },
  { id: 4, code: "SCD-0114", name: "EXA/Trexa Operations ScoreCard", departments: ["Systems", "Process"], durationMonths: [0,1,2,3,4,5,6,7,8,9,10,11], year: 2025, inputFrequency: "Monthly", kpis: 10, linkedScorecards: 1, poolSource: "Operations KPI Pool", company: "EXA", status: "ACTIVE", collaborators: 22 },
];
let archivedScorecards: ScorecardRecord[] = [];

const wait = () => new Promise((resolve) => window.setTimeout(resolve, 180));
const clone = (item: ScorecardRecord) => ({ ...item, departments: [...item.departments], durationMonths: [...item.durationMonths] });

export const scorecardService = {
  async list() {
    await wait();
    return scorecards.map(clone);
  },
  async getById(id: number) {
    await wait();
    const scorecard = scorecards.find((item) => item.id === id);
    if (!scorecard) throw new Error("ScoreCard not found.");
    return clone(scorecard);
  },
  async create(input: ScorecardInput) {
    await wait();
    const id = Math.max(0, ...scorecards.map((item) => item.id)) + 1;
    const created: ScorecardRecord = { ...input, id, code: `SCD-${String(110 + id).padStart(4, "0")}`, kpis: 0, linkedScorecards: 0 };
    scorecards = [created, ...scorecards];
    return clone(created);
  },
  async softDelete(id: number) {
    await wait();
    const scorecard = scorecards.find((item) => item.id === id);
    if (!scorecard) throw new Error("ScoreCard not found.");
    archivedScorecards = [clone(scorecard), ...archivedScorecards];
    scorecards = scorecards.filter((item) => item.id !== id);
  },
};
