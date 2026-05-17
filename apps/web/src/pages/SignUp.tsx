import { SignUp } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'

export function SignUpPage() {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <SignUp
          signInUrl="/sign-in"
          fallbackRedirectUrl="/"
        />
        <p style={{ marginTop: '1rem', textAlign: 'center' }}>
          Already have an account?{' '}
          <Link to="/sign-in" style={{ color: '#2563eb' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
