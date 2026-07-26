import { Outlet } from 'react-router-dom'
import { TabBar } from './TabBar'

export function AppShell() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col bg-[var(--color-bg)]">
      <main className="flex-1 overflow-y-auto px-4 pb-4 pt-6">
        <Outlet />
      </main>
      <TabBar />
    </div>
  )
}
