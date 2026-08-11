import { Outlet, useLocation } from 'react-router-dom'
import { TabBar } from './TabBar'

export function AppShell() {
  const location = useLocation()

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col bg-[var(--color-bg)]">
      <main className="flex-1 overflow-y-auto px-4 pb-4 pt-6">
        {/* Keyed by path so the fade replays on every tab/page change, not just first mount. */}
        <div key={location.pathname} className="animate-fade-in-up">
          <Outlet />
        </div>
      </main>
      <TabBar />
    </div>
  )
}
