import { SignIn } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'

export function SignInPage() {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <SignIn
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/"
        />
        <p style={{ marginTop: '1rem', textAlign: 'center' }}>
          Don&apos;t have an account?{' '}
          <Link to="/sign-up" style={{ color: '#2563eb' }}>Sign up</Link>
        </p>
      </div>
    </div>
  )
}
