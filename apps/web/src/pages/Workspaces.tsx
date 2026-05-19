import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthFetch } from '../hooks/useAuth'

interface Workspace {
  id: string
  name: string
  slug: string
  createdAt: string
}

export function Workspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const authFetch = useAuthFetch()
  const navigate = useNavigate()

  const handleCreate = async () => {
    if (!newName.trim()) return
    setError(null)
    setIsCreating(true)
    try {
      const res = await authFetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), slug: newName.trim().toLowerCase().replace(/\s+/g, '-') }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed')
      setWorkspaces((prev) => [...prev, data.data])
      setNewName('')
      setShowCreate(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Workspaces</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Workspace</button>
      </header>

      {error && <p className="page-error">{error}</p>}

      {showCreate && (
        <div className="panel">
          <input
            type="text"
            placeholder="Workspace name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
            autoFocus
          />
          <div className="inline-actions">
            <button className="btn btn-primary" onClick={handleCreate} disabled={isCreating || !newName.trim()}>{isCreating ? 'Creating...' : 'Create'}</button>
            <button className="btn btn-secondary" onClick={() => { setShowCreate(false); setNewName(''); setError(null) }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card-grid">
        {workspaces.length === 0 && <p className="empty-state">No workspaces yet. Create one above.</p>}
        {workspaces.map((ws) => (
          <div key={ws.id} className="card-item">
            <div className="card-icon">{ws.name[0]?.toUpperCase()}</div>
            <div className="card-body">
              <h3>{ws.name}</h3>
              <p className="card-meta">{new Date(ws.createdAt).toLocaleDateString()}</p>
            </div>
            <button className="btn btn-secondary btn-small" onClick={() => navigate(`/workspaces/${ws.id}`)}>Open</button>
          </div>
        ))}
      </div>
    </div>
  )
}
