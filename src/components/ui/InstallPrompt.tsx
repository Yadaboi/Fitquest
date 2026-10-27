import { useEffect, useState } from 'react'
import {
  clearDeferredPrompt,
  getDeferredPrompt,
  isIos,
  isStandalone,
  subscribeToInstallPrompt,
} from '../../lib/installPrompt'

const DISMISS_KEY = 'fitquest:install-dismissed-at'
const DISMISS_FOR_MS = 14 * 24 * 60 * 60 * 1000 // ask again after two weeks

function wasRecentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY))
    return at > 0 && Date.now() - at < DISMISS_FOR_MS
  } catch {
    return false
  }
}

function rememberDismissal() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch {
    // Private mode etc. — the card just comes back next visit.
  }
}

// Invites first-time visitors to put FitQuest on their home screen.
// Android/Chrome: a real "Install" button. iPhone: short Share-menu steps,
// since Safari has no install button for websites. Renders nothing when the
// app is already installed, was dismissed recently, or the browser can't install.
export function InstallPrompt({ className = '' }: { className?: string }) {
  const [hidden, setHidden] = useState(() => isStandalone() || wasRecentlyDismissed())
  const [canPrompt, setCanPrompt] = useState(() => getDeferredPrompt() !== null)
  const ios = isIos()

  useEffect(() => subscribeToInstallPrompt(() => setCanPrompt(getDeferredPrompt() !== null)), [])

  if (hidden || (!canPrompt && !ios)) return null

  function dismiss() {
    rememberDismissal()
    setHidden(true)
  }

  async function install() {
    const prompt = getDeferredPrompt()
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    clearDeferredPrompt()
    if (outcome === 'accepted') setHidden(true)
  }

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-[var(--color-accent)]/60 p-4 shadow-[0_10px_32px_-12px_var(--color-accent)] ${className}`}
      style={{
        background:
          'radial-gradient(120% 140% at 0% 0%, rgba(124, 108, 240, 0.28) 0%, rgba(124, 108, 240, 0.08) 45%, var(--color-surface) 75%)',
      }}
      aria-label="Install FitQuest"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 rounded-lg px-2 py-1 text-lg leading-none text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]"
      >
        ×
      </button>

      <div className="flex items-center gap-3 pr-6">
        <img
          src={`${import.meta.env.BASE_URL}pwa-192x192.png`}
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 flex-none rounded-xl shadow-[0_4px_14px_-4px_var(--color-accent)]"
        />
        <div>
          <p className="text-base font-semibold text-[var(--color-text)]">Take FitQuest with you</p>
          <p className="mt-0.5 text-sm leading-snug text-[var(--color-text-muted)]">
            Add it to your home screen.
            <br />
            Opens full-screen, like a real app.
          </p>
        </div>
      </div>

      {canPrompt ? (
        <button
          type="button"
          onClick={install}
          className="mt-4 w-full rounded-xl bg-[var(--color-accent)] py-2.5 text-sm font-semibold text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          Install FitQuest
        </button>
      ) : (
        <ol className="mt-4 flex flex-col gap-2 text-sm text-[var(--color-text-muted)]">
          <li className="flex items-center gap-2.5">
            <StepNumber n={1} />
            <span>
              Tap <ShareIcon /> <span className="font-medium text-[var(--color-text)]">Share</span> in
              your browser
            </span>
          </li>
          <li className="flex items-center gap-2.5">
            <StepNumber n={2} />
            <span>
              Choose <span className="font-medium text-[var(--color-text)]">Add to Home Screen</span>
            </span>
          </li>
        </ol>
      )}
    </section>
  )
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[var(--color-accent)] text-xs font-semibold text-[var(--color-accent-foreground)]">
      {n}
    </span>
  )
}

function ShareIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="inline -mt-0.5 text-[var(--color-accent)]"
    >
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  )
}
