// XP reward amounts live in shared/gamification-constants.ts (imported
// directly by callers that need them) so the client and the
// complete-workout edge function never drift apart. This file holds the
// level curve and rank titles — display concerns, but pure enough that the
// coach edge function also needs them (to detect a level-up from an XP
// delta), so they live in shared/ rather than src/lib/.

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
