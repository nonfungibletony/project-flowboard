import type { Board } from '@group/shared'
import { Link } from 'react-router-dom'
import { useState } from 'react'

interface Props {
  board: Board
  onRename: (id: string, name: string, description?: string) => Promise<void>
  onArchive: (id: string, archived: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function BoardCard({ board, onRename, onArchive, onDelete }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(board.name)
  const [editDesc, setEditDesc] = useState(board.description || '')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updatedAt = new Date(board.updatedAt)
  const now = new Date()
  const dayDiff = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24))

  let timeLabel: string
  if (dayDiff === 0) timeLabel = 'Today'
  else if (dayDiff === 1) timeLabel = 'Yesterday'
  else if (dayDiff < 30) timeLabel = `${dayDiff} days ago`
  else timeLabel = updatedAt.toLocaleDateString()

  const handleSave = async () => {
    if (!editName.trim()) return
    setError(null)
    try {
      await onRename(board.id, editName.trim(), editDesc.trim() || undefined)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename')
    }
  }

  const handleArchive = async () => {
    setIsArchiving(true)
    setError(null)
    try {
      await onArchive(board.id, board.archived !== 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive')
    } finally {
      setIsArchiving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this board? This cannot be undone.')) return
    setIsDeleting(true)
    setError(null)
    try {
      await onDelete(board.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
      setIsDeleting(false)
    }
  }

  if (isEditing) {
    return (
      <div className="board-card board-card-editing">
        <div className="board-card-header">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Board name"
            maxLength={200}
            autoFocus
          />
        </div>
        <input
          type="text"
          value={editDesc}
          onChange={(e) => setEditDesc(e.target.value)}
          placeholder="Description (optional)"
          maxLength={500}
        />
        {error && <p className="form-error">{error}</p>}
        <div className="inline-actions">
          <button className="btn btn-primary btn-small" onClick={handleSave}>Save</button>
          <button className="btn btn-secondary btn-small" onClick={() => { setIsEditing(false); setError(null); setEditName(board.name); setEditDesc(board.description || '') }}>Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div className={`board-card${board.archived ? ' board-card-archived' : ''}`}>
      <Link
        to={`/board/${board.id}`}
        className="board-card-link"
        aria-label={`Open board: ${board.name}`}
      >
        <div className="board-card-header">
          <h3>{board.name}</h3>
          {board.archived ? <span className="badge">Archived</span> : null}
        </div>
        {board.description ? (
          <p className="board-card-desc">{board.description}</p>
        ) : (
          <p className="board-card-placeholder"></p>
        )}
        <p className="board-card-meta">
          Updated {timeLabel}
        </p>
      </Link>
      <div className="board-card-actions">
        <button
          className="btn btn-secondary btn-small"
          onClick={(e) => { e.stopPropagation(); setIsEditing(true) }}
          title="Rename"
        >
          ✎
        </button>
        <button
          className="btn btn-secondary btn-small"
          onClick={(e) => { e.stopPropagation(); handleArchive() }}
          disabled={isArchiving}
          title={board.archived ? 'Unarchive' : 'Archive'}
        >
          {board.archived ? '↩' : '🗂'}
        </button>
        <button
          className="btn btn-danger btn-small"
          onClick={(e) => { e.stopPropagation(); handleDelete() }}
          disabled={isDeleting}
          title="Delete"
        >
          🗑
        </button>
      </div>
      {error && <p className="form-error" style={{ marginTop: '0.5rem' }}>{error}</p>}
    </div>
  )
}
