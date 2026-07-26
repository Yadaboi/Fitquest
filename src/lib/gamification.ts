// XP economy (Phase 2): flat per-set XP, a completion bonus, and a bigger PR spike.
export const XP_PER_SET = 10
export const COMPLETION_BONUS = 50
export const PR_BONUS = 100

// Accelerating level curve: fast early levels, longer grind later.
function xpRequiredForLevel(level: number): number {
  return Math.round(40 * Math.pow(1.35, level - 1))
}

export interface LevelProgress {
  level: number
  xpIntoLevel: number
  xpForNextLevel: number
}

export function getLevelProgress(totalXp: number): LevelProgress {
  let level = 1
  let remaining = totalXp

  while (remaining >= xpRequiredForLevel(level)) {
    remaining -= xpRequiredForLevel(level)
    level += 1
  }

  return {
    level,
    xpIntoLevel: remaining,
    xpForNextLevel: xpRequiredForLevel(level),
  }
}

// Light RPG flavor (Phase 2): rank titles wrap the level number, e.g. "Iron II".
const RANK_TIERS = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond']
const SUB_LEVELS = ['I', 'II', 'III']

export function getRankTitle(level: number): string {
  const tierIndex = Math.min(RANK_TIERS.length - 1, Math.floor((level - 1) / 3))
  const subIndex = (level - 1) % 3
  return `${RANK_TIERS[tierIndex]} ${SUB_LEVELS[subIndex]}`
}
