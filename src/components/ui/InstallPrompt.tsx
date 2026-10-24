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
      className={`relative rounded-2xl border border-[var(--color-accent)] bg-[var(--color-surface)] p-4 ${className}`}
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
      <p className="text-xs font-medium text-[var(--color-accent)]">Get the app</p>
      <p className="mt-1 pr-6 text-sm text-[var(--color-text)]">
        Add FitQuest to your home screen — it opens full-screen, like a normal app.
      </p>

      {canPrompt ? (
        <button
          type="button"
          onClick={install}
          className="mt-3 w-full rounded-xl bg-[var(--color-accent)] py-2.5 text-sm font-semibold text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          Install FitQuest
        </button>
      ) : (
        <ol className="mt-3 flex flex-col gap-1.5 text-sm text-[var(--color-text-muted)]">
          <li>
            1. Tap the <ShareIcon /> <span className="text-[var(--color-text)]">Share</span> button
            in your browser
          </li>
          <li>
            2. Choose <span className="text-[var(--color-text)]">Add to Home Screen</span>
          </li>
        </ol>
      )}
    </section>
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
