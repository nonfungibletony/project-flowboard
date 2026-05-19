import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-react'
import { Sidebar } from './components/Sidebar'
import { Home } from './pages/Home'
import { Board } from './pages/Board'
import { Workspaces } from './pages/Workspaces'
import { Members } from './pages/Members'
import { SignInPage } from './pages/SignIn'
import { SignUpPage } from './pages/SignUp'
import './index.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || ''

function ProtectedLayout() {
  return (
    <div className="app-layout">
      <SignedIn>
        <Sidebar />
        <main className="main-content">
          <Outlet />
        </main>
      </SignedIn>
      <SignedOut>
        <Navigate to="/sign-in" replace />
      </SignedOut>
    </div>
  )
}

function App() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <BrowserRouter>
        <Routes>
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/board/:boardId" element={<Board />} />
            <Route path="/workspaces" element={<Workspaces />} />
            <Route path="/members" element={<Members />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  )
}

export default App
