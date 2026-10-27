import { AnimatePresence, motion } from 'framer-motion'

export interface CelebrationData {
  title: string
  subtitle: string
  // Omitted for moments with no direct XP payout (e.g. a shield or an
  // achievement unlock) — the amount line is skipped rather than showing
  // a misleading "+0 XP".
  amount?: number
}

// The distinctly bigger moment (Phase 3): PRs, quest completions, level-ups.
// Visually unmistakable from the routine per-set tick.
export function Celebration({
  data,
  onDismiss,
}: {
  data: CelebrationData | null
  onDismiss: () => void
}) {
  return (
    <AnimatePresence>
      {data && (
        <motion.div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
        >
          <motion.div
            className="w-full max-w-xs rounded-2xl border border-celebration bg-surface p-6 text-center"
            initial={{ scale: 0.85, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          >
            <p className="text-sm font-medium text-celebration">{data.title}</p>
            <p className="mt-1 text-lg font-semibold text-text">{data.subtitle}</p>
            {data.amount !== undefined && (
              <p className="mt-3 text-2xl font-bold text-celebration">+{data.amount} XP</p>
            )}
            <button
              type="button"
              onClick={onDismiss}
              className="mt-5 w-full rounded-lg bg-celebration py-2.5 text-sm font-semibold text-celebration-foreground"
            >
              Nice!
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
