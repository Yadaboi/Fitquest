import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCoachMessages } from '../../hooks/useCoachMessages'
import { useSendCoachMessage } from '../../hooks/useSendCoachMessage'

export function CoachPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const userId = session!.user.id

  const { data: messages, isLoading } = useCoachMessages(userId)
  const sendMessage = useSendCoachMessage(userId)

  const [input, setInput] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return
    setErrorMessage(null)
    sendMessage.mutate(trimmed, {
      onSuccess: () => setInput(''),
      onError: (err) => {
        setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
      },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-text">Coach</h1>

      <section className="flex flex-col gap-3">
        {isLoading ? (
          <p className="text-sm text-text-muted">Loading your conversation...</p>
        ) : !messages || messages.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface p-4">
            <p className="text-sm text-text-muted">
              Ask your coach anything, or just say hey. The more you log, the better it gets to know
              your training and can tailor its advice to you.
            </p>
            <button
              type="button"
              onClick={() => navigate('/train')}
              className="text-xs font-medium text-accent"
            >
              Log a workout →
            </button>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {messages.map((msg) => (
              <li
                key={msg.id}
                className={'flex flex-col ' + (msg.role === 'user' ? 'items-end' : 'items-start')}
              >
                {msg.source === 'post_workout' && msg.role === 'assistant' && (
                  <span className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text-faint">
                    Check-in
                  </span>
                )}
                <p
                  className={
                    'max-w-[85%] rounded-2xl px-3 py-2 text-sm ' +
                    (msg.role === 'user'
                      ? 'bg-accent text-accent-foreground'
                      : 'border border-border bg-surface text-text')
                  }
                >
                  {msg.content}
                </p>
              </li>
            ))}
          </ul>
        )}

        {sendMessage.isPending && <p className="text-sm text-text-faint">Coach is thinking...</p>}

        {errorMessage && <p className="text-xs text-danger">{errorMessage}</p>}
      </section>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your coach..."
          className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-faint"
        />
        <button
          type="submit"
          disabled={sendMessage.isPending || !input.trim()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-40"
        >
          {sendMessage.isPending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  )
}
