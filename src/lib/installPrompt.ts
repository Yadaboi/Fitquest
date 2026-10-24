// Captures the browser's "install this app" event as early as possible.
// Chrome/Edge/Android fire `beforeinstallprompt` once, usually before React
// has mounted the screen that wants to use it, so we grab it at module load
// (this file is imported from main.tsx) and hand it out later.

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((fn) => fn())
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // keep Chrome's mini-infobar from showing; we show our own
    deferredPrompt = e as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    notify()
  })
}

export function getDeferredPrompt() {
  return deferredPrompt
}

export function clearDeferredPrompt() {
  deferredPrompt = null
  notify()
}

export function subscribeToInstallPrompt(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

// Already running as an installed app (home-screen icon) — never prompt.
export function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

// iPhone/iPad. iPadOS reports itself as a Mac, so also check for touch.
export function isIos() {
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}
