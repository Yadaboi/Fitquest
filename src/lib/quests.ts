import type { SessionQuest } from '../types/domain'

// Today's session quests — shared between the Home preview (shown before a
// workout starts) and Train's live tracking, so the two never drift.
// Matches the two conditions the complete-workout edge function checks
// server-side when deciding whether to award a shield.
export const DEFAULT_SESSION_QUESTS: SessionQuest[] = [
  { id: 'all-exercises', title: 'Complete every exercise', isComplete: false },
  { id: 'beat-best', title: 'Beat a previous best on any lift', isComplete: false },
]
