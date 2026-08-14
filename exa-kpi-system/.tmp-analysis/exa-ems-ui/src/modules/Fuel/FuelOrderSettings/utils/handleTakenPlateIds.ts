import type { FuelLimitRule } from '../types/fuelOrderSettings.types'

/**
 * For each fuel limit rule, compute `takenIds` — the set of asset IDs
 * assigned to *other* rules — so the plates picker can filter them out.
 */
const handleTakenPlateIds = (rules: FuelLimitRule[]): FuelLimitRule[] => {
  const normalized = rules.map((r) => ({
    ...r,
    takenIds: [] as number[],
    assetIds: r.assetIds ?? [],
  }))

  const allAssetIds = new Set(normalized.flatMap((r) => r.assetIds))

  return normalized.map((r) => {
    const mine = new Set(r.assetIds)
    const others = Array.from(allAssetIds).filter((id) => !mine.has(id))
    return { ...r, takenIds: Array.from(new Set([...r.takenIds, ...others])) }
  })
}

export default handleTakenPlateIds
