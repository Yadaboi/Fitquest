import { useNavigate } from 'react-router-dom'
import { useFriendsList } from '../../hooks/useFriendsList'
import { getLevelProgress } from '../../lib/gamification'

const MAX_SHOWN = 4

export function FriendsCard({ userId }: { userId: string | undefined }) {
  const navigate = useNavigate()
  const { friends, incomingRequests, isLoading } = useFriendsList(userId)

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-[var(--color-text-faint)]">Friends</p>
        {incomingRequests.length > 0 && (
          <span className="rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-accent-foreground)]">
            {incomingRequests.length} pending
          </span>
        )}
      </div>

      {!isLoading && friends.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          No friends yet — add one by email to compare progress.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {friends.slice(0, MAX_SHOWN).map((entry) => {
            const name = entry.other?.displayName || 'Friend'
            const level = getLevelProgress(entry.other?.totalXp ?? 0).level
            return (
              <li key={entry.friendshipId} className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-text)]">{name}</span>
                <span className="text-[var(--color-text-faint)]">Level {level}</span>
              </li>
            )
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={() => navigate('/friends')}
        className="mt-3 text-xs font-medium text-[var(--color-accent)]"
      >
        {friends.length === 0 ? 'Add a friend' : 'See all friends'}
      </button>
    </section>
  )
}
