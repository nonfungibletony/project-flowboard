import { useState, useEffect } from 'react'
import { useAuthFetch } from '../hooks/useAuth'

interface Member {
  id: string
  name: string
  email: string
  role: string
}

export function Members() {
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const authFetch = useAuthFetch()

  useEffect(() => {
    setIsLoading(true)
    authFetch('/api/users')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setMembers(data.data.map((u: any) => ({ id: u.id, name: u.name, email: u.email, role: 'Member' })))
        else setError(data.message || 'Failed to load')
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setIsLoading(false))
  }, [authFetch])

  if (isLoading) return <p>Loading members...</p>

  return (
    <div className="page">
      <header className="page-header">
        <h1>Members</h1>
        <span className="badge">{members.length} members</span>
      </header>
      {error && <p className="page-error">{error}</p>}
      <div className="member-list">
        {members.map((m) => (
          <div key={m.id} className="member-row">
            <div className="member-avatar">{m.name[0]?.toUpperCase()}</div>
            <div className="member-info">
              <span className="member-name">{m.name}</span>
              <span className="member-email">{m.email}</span>
            </div>
            <span className="member-role">{m.role}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
