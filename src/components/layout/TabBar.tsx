import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'

const TABS = [
  { to: '/', label: 'Home', end: true },
  { to: '/train', label: 'Train', end: false },
  { to: '/stats', label: 'Stats', end: false },
  { to: '/profile', label: 'Profile', end: false },
] as const

export function TabBar() {
  return (
    <nav
      className="sticky bottom-0 z-10 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur"
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.end}
              className="relative flex flex-col items-center gap-1 py-3 text-xs font-medium text-[var(--color-text-faint)] transition-colors"
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="tab-indicator"
                      className="absolute top-0 h-0.5 w-8 rounded-full bg-[var(--color-accent)]"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className={isActive ? 'text-[var(--color-text)]' : ''}>
                    {tab.label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
