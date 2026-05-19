import { useState } from 'react'
import { useWorkspaces } from '../hooks/useWorkspaces'
import { useMembers } from '../hooks/useMembers'

export function Members() {
  const { workspaces, isLoading: wsLoading } = useWorkspaces()
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('')

  const {
    members,
    isLoading,
    error,
    addMember,
    removeMember,
    isAdding,
    isRemoving,
  } = useMembers(selectedWorkspaceId || undefined)

  const [newEmail, setNewEmail] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!newEmail.trim()) return
    setLocalError(null)
    const ok = await addMember(newEmail.trim())
    if (ok) {
      setNewEmail('')
    } else {
      setLocalError(error?.message || 'Failed to add member')
    }
  }

  const handleRemove = async (memberId: string, memberName: string) => {
    if (!window.confirm(`Remove ${memberName} from this workspace?`)) return
    setLocalError(null)
    try {
      await removeMember(memberId)
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Failed to remove')
    }
  }

  const displayError = error?.message || localError

  return (
    <div className="page">
      <header className="page-header">
        <h1>Members</h1>
      </header>

      {wsLoading ? (
        <p className="loading-state">Loading workspaces…</p>
      ) : workspaces.length === 0 ? (
        <p className="empty-state">Create a workspace first to manage members.</p>
      ) : (
        <div className="panel" style={{ marginBottom: '24px' }}>
          <label className="form-label">Workspace</label>
          <select
            className="form-select"
            value={selectedWorkspaceId}
            onChange={(e) => {
              setSelectedWorkspaceId(e.target.value)
              setLocalError(null)
            }}
          >
            <option value="">Select a workspace…</option>
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </select>
        </div>
      )}

      {selectedWorkspaceId && (
        <>
          {displayError && <p className="page-error">{displayError}</p>}

          <div className="panel" style={{ marginBottom: '24px' }}>
            <label className="form-label">Add member by email</label>
            <div className="inline-actions">
              <input
                type="email"
                placeholder="tony@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
                style={{ minWidth: '280px' }}
              />
              <button
                className="btn btn-primary"
                onClick={handleAdd}
                disabled={isAdding || !newEmail.trim()}
              >
                {isAdding ? 'Adding…' : '+ Add Member'}
              </button>
            </div>
            <p className="hint-text" style={{ fontSize: '12px', opacity: 0.6, marginTop: '6px' }}>
              They must have signed in to Flowboard at least once.
            </p>
          </div>

          {isLoading ? (
            <div className="loading-state"><p>Loading members…</p></div>
          ) : members.length === 0 ? (
            <p className="empty-state">No members yet. Add someone above.</p>
          ) : (
            <div className="member-list">
              {members.map((m) => (
                <div key={m.id} className="member-row">
                  <div className="member-avatar">{m.name[0]?.toUpperCase()}</div>
                  <div className="member-info">
                    <span className="member-name">{m.name}</span>
                    <span className="member-email">{m.email}</span>
                  </div>
                  <div className="member-actions">
                    <span className="member-role">{m.role}</span>
                    <button
                      className="btn btn-danger btn-small"
                      onClick={() => handleRemove(m.id, m.name)}
                      disabled={isRemoving}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
