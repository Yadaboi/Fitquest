import {
  QUEST_MIN_DISTINCT_EXERCISES,
  QUEST_MIN_CARDIO_MINUTES,
} from '../../shared/gamification-constants'
import type { DayType, SessionQuest } from '../types/domain'

// Today's session quests — shared between the Home preview (shown before a
// workout starts) and Train's live tracking, so the two never drift. Matches
// the two conditions the complete-workout edge function checks server-side
// when deciding whether to award a shield. A cardio day gets a duration-based
// quest instead of "log N distinct exercises" — a single-activity cardio
// session shouldn't be held to a variety bar that doesn't apply to it.
export function getSessionQuestsForDayType(dayType: DayType | null): SessionQuest[] {
  if (dayType === 'cardio') {
    return [
      {
        id: 'cardio-minutes',
        title: `Log at least ${QUEST_MIN_CARDIO_MINUTES} minutes of cardio`,
        isComplete: false,
      },
      { id: 'beat-best', title: 'Beat a previous best duration', isComplete: false },
    ]
  }
  return [
    {
      id: 'exercise-variety',
      title: `Log at least ${QUEST_MIN_DISTINCT_EXERCISES} distinct exercises`,
      isComplete: false,
    },
    { id: 'beat-best', title: 'Beat a previous best on any lift', isComplete: false },
  ]
}
