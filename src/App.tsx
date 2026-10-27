import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthPage } from './features/auth/AuthPage'
import { LoadingScreen } from './components/ui/LoadingScreen'
import { useAuth } from './context/AuthContext'
import { useProfile } from './hooks/useProfile'

// Everything behind sign-in is loaded on demand, so a first-time visitor only
// downloads what the sign-up screen needs and sees it sooner.
const AppShell = lazy(() =>
  import('./components/layout/AppShell').then((m) => ({ default: m.AppShell })),
)
const HomePage = lazy(() =>
  import('./features/home/HomePage').then((m) => ({ default: m.HomePage })),
)
const TrainPage = lazy(() =>
  import('./features/train/TrainPage').then((m) => ({ default: m.TrainPage })),
)
const StatsPage = lazy(() =>
  import('./features/stats/StatsPage').then((m) => ({ default: m.StatsPage })),
)
const ProfilePage = lazy(() =>
  import('./features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })),
)
const FriendsPage = lazy(() =>
  import('./features/friends/FriendsPage').then((m) => ({ default: m.FriendsPage })),
)
const CoachPage = lazy(() =>
  import('./features/coach/CoachPage').then((m) => ({ default: m.CoachPage })),
)
const OnboardingPage = lazy(() =>
  import('./features/onboarding/OnboardingPage').then((m) => ({ default: m.OnboardingPage })),
)

function AuthedApp({ userId }: { userId: string }) {
  const { data: profile, isLoading } = useProfile(userId)

  if (isLoading || !profile) return <LoadingScreen />

  const hasOnboarded = profile.experience_level !== null

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route
            path="/onboarding"
            element={hasOnboarded ? <Navigate to="/" replace /> : <OnboardingPage />}
          />
          <Route element={hasOnboarded ? <AppShell /> : <Navigate to="/onboarding" replace />}>
            <Route index element={<HomePage />} />
            <Route path="train" element={<TrainPage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="friends" element={<FriendsPage />} />
            <Route path="coach" element={<CoachPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

function App() {
  const { session, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!session) return <AuthPage />

  return <AuthedApp userId={session.user.id} />
}

export default App
