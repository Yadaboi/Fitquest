import { AnimatePresence, motion } from 'framer-motion'

export interface XpTick {
  id: string
  amount: number
}

// Layered feedback (Phase 3): a quick, light response for every routine set —
// fast enough not to slow down the next one.
export function XpTickStack({ ticks }: { ticks: XpTick[] }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-20 flex flex-col items-end gap-1">
      <AnimatePresence>
        {ticks.map((tick) => (
          <motion.span
            key={tick.id}
            initial={{ opacity: 0, y: 0, scale: 0.8 }}
            animate={{ opacity: 1, y: -12, scale: 1 }}
            exit={{ opacity: 0, y: -28 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground shadow-lg"
          >
            +{tick.amount} XP
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}
