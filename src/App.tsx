import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { HomePage } from './features/home/HomePage'
import { TrainPage } from './features/train/TrainPage'
import { StatsPage } from './features/stats/StatsPage'
import { ProfilePage } from './features/profile/ProfilePage'
import { FriendsPage } from './features/friends/FriendsPage'
import { CoachPage } from './features/coach/CoachPage'
import { OnboardingPage } from './features/onboarding/OnboardingPage'
import { AuthPage } from './features/auth/AuthPage'
import { LoadingScreen } from './components/ui/LoadingScreen'
import { useAuth } from './context/AuthContext'
import { useProfile } from './hooks/useProfile'

function AuthedApp({ userId }: { userId: string }) {
  const { data: profile, isLoading } = useProfile(userId)

  if (isLoading || !profile) return <LoadingScreen />

  const hasOnboarded = profile.experience_level !== null

  return (
    <BrowserRouter>
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
