import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const MIN_PASSWORD_LENGTH = 6

export function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfoMessage(null)

    if (mode === 'signup' && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password needs to be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }

    setIsSubmitting(true)

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password })
      setIsSubmitting(false)
      if (error) {
        setError(error.message)
      } else if (!data.session) {
        // Email confirmation is required — signUp succeeds but returns no
        // session, so without this the screen would just look stuck.
        setInfoMessage('Check your email to confirm your account, then sign in.')
        setMode('signin')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setIsSubmitting(false)
      if (error) setError(error.message)
    }
  }

  return (
    <div className="flex min-h-svh flex-col justify-center gap-8 px-6 py-10">
      <div>
        <p className="text-sm font-medium text-[var(--color-accent)]">FitQuest</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text)]">
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm text-[var(--color-text-muted)]">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-[var(--color-text-muted)]">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
          />
          {mode === 'signup' && (
            <span className="text-xs text-[var(--color-text-faint)]">
              At least {MIN_PASSWORD_LENGTH} characters.
            </span>
          )}
        </label>

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
        {infoMessage && <p className="text-sm text-[var(--color-success)]">{infoMessage}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 w-full rounded-xl bg-[var(--color-accent)] py-3 text-sm font-semibold text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Please wait...' : mode === 'signup' ? 'Sign up' : 'Sign in'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === 'signup' ? 'signin' : 'signup')
          setError(null)
          setInfoMessage(null)
        }}
        className="cursor-pointer text-sm text-[var(--color-text-faint)]"
      >
        {mode === 'signup' ? 'Already have an account? Sign in' : "New here? Create an account"}
      </button>
    </div>
  )
}
