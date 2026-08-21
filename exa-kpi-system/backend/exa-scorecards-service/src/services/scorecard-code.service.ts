import type { Prisma } from "@prisma/client";
import { formatScorecardCode } from "../utils/scorecard-code.js";

export async function allocateScorecardCode(tx: Prisma.TransactionClient, scopeKey: string, issueYear: number) {
  await tx.$executeRaw`INSERT INTO scorecard_code_sequences (scope_key, issue_year, last_sequence, created_at, updated_at)
    VALUES (${scopeKey}, ${issueYear}, 1, NOW(3), NOW(3))
    ON DUPLICATE KEY UPDATE last_sequence = last_sequence + 1, updated_at = NOW(3)`;
  const rows = await tx.$queryRaw<Array<{ sequence: bigint }>>`SELECT last_sequence AS sequence
    FROM scorecard_code_sequences WHERE scope_key = ${scopeKey} AND issue_year = ${issueYear} FOR UPDATE`;
  const sequence = Number(rows[0]?.sequence);
  if (!Number.isSafeInteger(sequence) || sequence < 1) throw new Error("Scorecard sequence allocation failed");
  return { sequence, code: formatScorecardCode(scopeKey, sequence, issueYear) };
}
