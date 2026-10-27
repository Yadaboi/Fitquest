import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useFriendsList, type FriendEntry } from '../../hooks/useFriendsList'
import { useSendFriendRequest } from '../../hooks/useSendFriendRequest'
import { useAcceptFriendRequest } from '../../hooks/useAcceptFriendRequest'
import { useRemoveFriendship } from '../../hooks/useRemoveFriendship'
import { getLevelProgress } from '../../lib/gamification'

function displayName(entry: FriendEntry): string {
  return entry.other?.displayName || 'Someone'
}

export function FriendsPage() {
  const { session } = useAuth()
  const userId = session!.user.id

  const { friends, incomingRequests, outgoingRequests } = useFriendsList(userId)
  const sendRequest = useSendFriendRequest(userId)
  const acceptRequest = useAcceptFriendRequest(userId)
  const removeFriendship = useRemoveFriendship(userId)

  const [email, setEmail] = useState('')
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)

  function handleSendRequest(e: React.FormEvent) {
    e.preventDefault()
    setFeedback(null)
    sendRequest.mutate(email, {
      onSuccess: () => {
        setFeedback({ kind: 'success', text: 'Friend request sent.' })
        setEmail('')
      },
      onError: (err) => {
        setFeedback({
          kind: 'error',
          text: err instanceof Error ? err.message : 'Something went wrong.',
        })
      },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-text">Friends</h1>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-xs font-medium text-text-faint">Add a friend</p>
        <form onSubmit={handleSendRequest} className="mt-2 flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Their FitQuest email"
            className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-faint"
          />
          <button
            type="submit"
            disabled={sendRequest.isPending || !email.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-40"
          >
            {sendRequest.isPending ? 'Sending...' : 'Add'}
          </button>
        </form>
        {feedback && (
          <p
            className={
              'mt-2 text-xs ' + (feedback.kind === 'error' ? 'text-danger' : 'text-success')
            }
          >
            {feedback.text}
          </p>
        )}
      </section>

      {incomingRequests.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="text-xs font-medium text-text-faint">Requests</p>
          <ul className="flex flex-col gap-2">
            {incomingRequests.map((entry) => (
              <li
                key={entry.friendshipId}
                className="flex items-center justify-between rounded-xl border border-border bg-surface p-3"
              >
                <span className="text-sm text-text">{displayName(entry)}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => acceptRequest.mutate(entry.friendshipId)}
                    className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFriendship.mutate(entry.friendshipId)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted"
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {outgoingRequests.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="text-xs font-medium text-text-faint">Pending</p>
          <ul className="flex flex-col gap-2">
            {outgoingRequests.map((entry) => (
              <li
                key={entry.friendshipId}
                className="flex items-center justify-between rounded-xl border border-border bg-surface p-3"
              >
                <span className="text-sm text-text">{displayName(entry)}</span>
                <button
                  type="button"
                  onClick={() => removeFriendship.mutate(entry.friendshipId)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted"
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <p className="text-xs font-medium text-text-faint">Your friends</p>
        {friends.length === 0 ? (
          <p className="text-sm text-text-muted">
            Nobody yet — send a request above to get started.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {friends.map((entry) => {
              const level = getLevelProgress(entry.other?.totalXp ?? 0).level
              const streakWeeks = entry.other?.streakWeeks ?? 0
              return (
                <li
                  key={entry.friendshipId}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-text">{displayName(entry)}</p>
                    <p className="text-xs text-text-faint">
                      Level {level} · {streakWeeks} wk streak
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFriendship.mutate(entry.friendshipId)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted"
                  >
                    Remove
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
