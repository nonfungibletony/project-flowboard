import { useState } from 'react'
import { useWorkspaces } from '../hooks/useWorkspaces'
import { useNavigate } from 'react-router-dom'

export function Workspaces() {
  const navigate = useNavigate()
  const {
    workspaces,
    isLoading,
    error,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    isCreating,
    isUpdating,
    isDeleting,
  } = useWorkspaces()

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!newName.trim()) return
    setLocalError(null)
    const result = await createWorkspace(newName.trim())
    if (result) {
      setNewName('')
      setShowCreate(false)
    } else {
      setLocalError('Failed to create workspace')
    }
  }

  const startEdit = (id: string, name: string) => {
    setEditId(id)
    setEditName(name)
  }

  const saveEdit = async () => {
    if (!editId || !editName.trim()) return
    setLocalError(null)
    try {
      await updateWorkspace(editId, { name: editName.trim() })
      setEditId(null)
      setEditName('')
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Failed to update')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this workspace? Boards inside it will also be removed.')) return
    setLocalError(null)
    try {
      await deleteWorkspace(id)
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  const displayError = error?.message || localError

  return (
    <div className="page">
      <header className="page-header">
        <h1>Workspaces</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreate(true)}
          disabled={isCreating}
        >
          + New Workspace
        </button>
      </header>

      {displayError && <p className="page-error">{displayError}</p>}

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
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={isCreating || !newName.trim()}
            >
              {isCreating ? 'Creating…' : 'Create'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowCreate(false)
                setNewName('')
                setLocalError(null)
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="loading-state"><p>Loading workspaces…</p></div>
      ) : workspaces.length === 0 ? (
        <p className="empty-state">No workspaces yet. Create one above.</p>
      ) : (
        <div className="card-grid">
          {workspaces.map((ws) => (
            <div key={ws.id} className="card-item">
              <div className="card-icon">{ws.name[0]?.toUpperCase()}</div>
              <div className="card-body">
                {editId === ws.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit()
                      if (e.key === 'Escape') { setEditId(null); setEditName('') }
                    }}
                    autoFocus
                  />
                ) : (
                  <>
                    <h3>{ws.name}</h3>
                    <p className="card-meta">
                      {new Date(ws.createdAt).toLocaleDateString()} · /w/{ws.slug}
                    </p>
                  </>
                )}
              </div>
              <div className="inline-actions">
                {editId === ws.id ? (
                  <>
                    <button
                      className="btn btn-primary btn-small"
                      onClick={saveEdit}
                      disabled={isUpdating || !editName.trim()}
                    >
                      {isUpdating ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => { setEditId(null); setEditName('') }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => navigate(`/workspaces/${ws.id}`)}
                    >
                      Open
                    </button>
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => startEdit(ws.id, ws.name)}
                    >
                      Rename
                    </button>
                    <button
                      className="btn btn-danger btn-small"
                      onClick={() => handleDelete(ws.id)}
                      disabled={isDeleting}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
