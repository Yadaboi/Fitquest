import { useNavigate } from 'react-router-dom'
import { useLatestCoachMessage } from '../../hooks/useLatestCoachMessage'

// The product goal is for this to be "one of the main reasons users return
// every day" — so it sits above GoalsCard/FriendsCard on Home, not below.
export function CoachCard({ userId }: { userId: string | undefined }) {
  const navigate = useNavigate()
  const { data: latest, isLoading } = useLatestCoachMessage(userId)

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="text-xs font-medium text-[var(--color-text-faint)]">Coach</p>
      {!isLoading && (
        <p className="mt-2 line-clamp-2 text-sm text-[var(--color-text)]">
          {latest ? latest.content : 'Ask your coach anything — it knows your training history.'}
        </p>
      )}
      <button
        type="button"
        onClick={() => navigate('/coach')}
        className="mt-3 text-xs font-medium text-[var(--color-accent)]"
      >
        {latest ? 'Continue the conversation' : 'Talk to your coach'}
      </button>
    </section>
  )
}
