import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { InstallPrompt } from '../../components/ui/InstallPrompt'

const MIN_PASSWORD_LENGTH = 6

export function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleGoogleSignIn() {
    setError(null)
    setInfoMessage(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}` },
    })
    if (error) setError(error.message)
  }

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
      <InstallPrompt className="animate-fade-in-up" />

      <div className="animate-fade-in-up">
        <p className="text-sm font-medium text-[var(--color-accent)]">FitQuest</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text)]">
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="animate-fade-in-up flex flex-col gap-4"
        style={{ animationDelay: '50ms' }}
      >
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

      <div
        className="animate-fade-in-up flex items-center gap-3 text-xs text-[var(--color-text-faint)]"
        style={{ animationDelay: '100ms' }}
      >
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        or
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="animate-fade-in-up flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-2)]"
        style={{ animationDelay: '140ms' }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.35 0-4.34-1.58-5.05-3.71H.95v2.33A9 9 0 0 0 9 18z"
          />
          <path
            fill="#FBBC05"
            d="M3.95 10.71A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.71V4.96H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.04l3-2.33z"
          />
          <path
            fill="#EA4335"
            d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.96l3 2.33C4.66 5.16 6.65 3.58 9 3.58z"
          />
        </svg>
        Continue with Google
      </button>

      <button
        type="button"
        onClick={() => {
          setMode(mode === 'signup' ? 'signin' : 'signup')
          setError(null)
          setInfoMessage(null)
        }}
        className="animate-fade-in-up cursor-pointer text-sm text-[var(--color-text-faint)]"
        style={{ animationDelay: '180ms' }}
      >
        {mode === 'signup' ? 'Already have an account? Sign in' : "New here? Create an account"}
      </button>
    </div>
  )
}
