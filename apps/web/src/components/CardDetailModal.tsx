import { useState, useEffect, useRef } from 'react'
import type { Card, Comment, Checklist, ChecklistItem } from '@group/shared'

interface Props {
  card: Card
  comments: Comment[]
  isLoading: boolean
  error: string | null
  onClose: () => void
  onUpdate: (updates: { title?: string; description?: string }) => Promise<void>
  onAddComment: (content: string) => Promise<void>
  onDeleteCard: (cardId: string) => Promise<void>
  onLoadChecklists: (cardId: string, columnId: string) => Promise<Checklist[]>
  onCreateChecklist: (cardId: string, columnId: string, title: string) => Promise<Checklist>
  onDeleteChecklist: (cardId: string, columnId: string, checklistId: string) => Promise<void>
  onCreateChecklistItem: (cardId: string, columnId: string, checklistId: string, content: string) => Promise<ChecklistItem>
  onUpdateChecklistItem: (cardId: string, columnId: string, checklistId: string, itemId: string, updates: { content?: string; completed?: boolean }) => Promise<ChecklistItem>
  onDeleteChecklistItem: (cardId: string, columnId: string, checklistId: string, itemId: string) => Promise<void>
}

export function CardDetailModal({
  card,
  comments,
  isLoading,
  error,
  onClose,
  onUpdate,
  onAddComment,
  onDeleteCard,
  onLoadChecklists,
  onCreateChecklist,
  onDeleteChecklist,
  onCreateChecklistItem,
  onUpdateChecklistItem,
  onDeleteChecklistItem,
}: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description || '')
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [commentInput, setCommentInput] = useState('')
  const [commentError, setCommentError] = useState<string | null>(null)
  const [isCommenting, setIsCommenting] = useState(false)

  const [checklists, setChecklists] = useState<Checklist[]>(card.checklists || [])
  const [checklistLoading, setChecklistLoading] = useState(false)
  const [newChecklistTitle, setNewChecklistTitle] = useState('')
  const [addingChecklist, setAddingChecklist] = useState(false)
  const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({})
  const [addingItem, setAddingItem] = useState<Record<string, boolean>>({})

  const overlayRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTitle(card.title)
    setDescription(card.description || '')
    setChecklists(card.checklists || [])
  }, [card.id, card.title, card.description, card.checklists])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  useEffect(() => {
    let mounted = true
    if (!card.checklists?.length && !checklistLoading) {
      setChecklistLoading(true)
      onLoadChecklists(card.id, card.columnId)
        .then((cls) => { if (mounted) setChecklists(cls) })
        .catch(() => {})
        .finally(() => { if (mounted) setChecklistLoading(false) })
    }
    return () => { mounted = false }
  }, [card.id, card.columnId])

  const handleSave = async () => {
    if (!title.trim()) return
    setUpdateError(null)
    setIsSaving(true)
    try {
      await onUpdate({
        title: title.trim(),
        description: description.trim() || undefined,
      })
      setIsEditing(false)
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setTitle(card.title)
    setDescription(card.description || '')
    setUpdateError(null)
    setIsEditing(false)
  }

  const handleAddComment = async () => {
    if (!commentInput.trim()) return
    setCommentError(null)
    setIsCommenting(true)
    try {
      await onAddComment(commentInput.trim())
      setCommentInput('')
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Failed to add comment')
    } finally {
      setIsCommenting(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this card? This cannot be undone.')) return
    try {
      await onDeleteCard(card.id)
      onClose()
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const handleAddChecklist = async () => {
    if (!newChecklistTitle.trim()) return
    setAddingChecklist(true)
    try {
      const cl = await onCreateChecklist(card.id, card.columnId, newChecklistTitle.trim())
      setChecklists((prev) => [...prev, cl])
      setNewChecklistTitle('')
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to add checklist')
    } finally {
      setAddingChecklist(false)
    }
  }

  const handleDeleteChecklist = async (checklistId: string) => {
    if (!window.confirm('Delete this checklist?')) return
    try {
      await onDeleteChecklist(card.id, card.columnId, checklistId)
      setChecklists((prev) => prev.filter((c) => c.id !== checklistId))
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to delete checklist')
    }
  }

  const handleAddItem = async (checklistId: string) => {
    const content = newItemInputs[checklistId]?.trim()
    if (!content) return
    setAddingItem((prev) => ({ ...prev, [checklistId]: true }))
    try {
      const item = await onCreateChecklistItem(card.id, card.columnId, checklistId, content)
      setChecklists((prev) =>
        prev.map((cl) =>
          cl.id === checklistId
            ? { ...cl, items: [...(cl.items || []), item] }
            : cl
        )
      )
      setNewItemInputs((prev) => ({ ...prev, [checklistId]: '' }))
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to add item')
    } finally {
      setAddingItem((prev) => ({ ...prev, [checklistId]: false }))
    }
  }

  const handleToggleItem = async (checklistId: string, item: ChecklistItem) => {
    try {
      const updated = await onUpdateChecklistItem(card.id, card.columnId, checklistId, item.id, {
        completed: !item.completed,
      })
      setChecklists((prev) =>
        prev.map((cl) =>
          cl.id === checklistId
            ? { ...cl, items: (cl.items || []).map((i) => (i.id === updated.id ? updated : i)) }
            : cl
        )
      )
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to update item')
    }
  }

  const handleDeleteItem = async (checklistId: string, itemId: string) => {
    try {
      await onDeleteChecklistItem(card.id, card.columnId, checklistId, itemId)
      setChecklists((prev) =>
        prev.map((cl) =>
          cl.id === checklistId
            ? { ...cl, items: (cl.items || []).filter((i) => i.id !== itemId) }
            : cl
        )
      )
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to delete item')
    }
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const completedCount = checklists.reduce(
    (sum, cl) => sum + (cl.items || []).filter((i) => i.completed).length,
    0
  )
  const totalCount = checklists.reduce(
    (sum, cl) => sum + (cl.items || []).length,
    0
  )

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div className="modal card-detail-modal">
        {isLoading ? (
          <p>Loading card...</p>
        ) : (
          <>
            <div className="card-detail-header">
              {isEditing ? (
                <>
                  <input
                    ref={inputRef}
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={500}
                    disabled={isSaving}
                  />
                  <div className="inline-actions">
                    <button
                      className="btn btn-primary btn-small"
                      onClick={handleSave}
                      disabled={isSaving || !title.trim()}
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={handleCancel}
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2>{card.title}</h2>
                  <div className="inline-actions">
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => setIsEditing(true)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger btn-small"
                      onClick={handleDelete}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>

            {(error || updateError) && <p className="form-error">{updateError || error}</p>}

            <div className="card-detail-meta">
              <p>Updated {formatTime(card.updatedAt)}</p>
            </div>

            <div className="card-detail-section">
              <h4>Description</h4>
              {isEditing ? (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={5000}
                  disabled={isSaving}
                  rows={4}
                />
              ) : card.description ? (
                <p className="card-description">{card.description}</p>
              ) : (
                <p className="card-description-placeholder">No description</p>
              )}
            </div>

            <div className="card-detail-section">
              <h4>
                Checklists
                {totalCount > 0 && (
                  <span className="checklist-summary">
                    {' '}
                    ({completedCount}/{totalCount})
                  </span>
                )}
              </h4>
              {checklistLoading && <p className="checklist-loading">Loading checklists...</p>}
              {checklists.map((cl) => (
                <div key={cl.id} className="checklist-block">
                  <div className="checklist-header">
                    <span className="checklist-title">{cl.title}</span>
                    <button
                      className="btn btn-danger btn-small"
                      onClick={() => handleDeleteChecklist(cl.id)}
                    >
                      Delete
                    </button>
                  </div>
                  <ul className="checklist-items">
                    {(cl.items || []).map((item) => (
                      <li key={item.id} className="checklist-item">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => handleToggleItem(cl.id, item)}
                        />
                        <span className={item.completed ? 'checklist-item-done' : ''}>{item.content}</span>
                        <button
                          className="btn btn-danger btn-small checklist-item-delete"
                          onClick={() => handleDeleteItem(cl.id, item.id)}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="checklist-add-item">
                    <input
                      type="text"
                      placeholder="Add an item..."
                      value={newItemInputs[cl.id] || ''}
                      onChange={(e) =>
                        setNewItemInputs((prev) => ({
                          ...prev,
                          [cl.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddItem(cl.id)
                      }}
                      disabled={addingItem[cl.id]}
                    />
                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => handleAddItem(cl.id)}
                      disabled={addingItem[cl.id] || !newItemInputs[cl.id]?.trim()}
                    >
                      {addingItem[cl.id] ? '...' : 'Add'}
                    </button>
                  </div>
                </div>
              ))}
              <div className="checklist-add-block">
                <input
                  type="text"
                  placeholder="New checklist title..."
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddChecklist()
                  }}
                  disabled={addingChecklist}
                />
                <button
                  className="btn btn-primary btn-small"
                  onClick={handleAddChecklist}
                  disabled={addingChecklist || !newChecklistTitle.trim()}
                >
                  {addingChecklist ? '...' : 'Add Checklist'}
                </button>
              </div>
            </div>

            <div className="card-detail-section">
              <h4>Comments ({comments.length})</h4>
              <div className="comments-list">
                {comments.length === 0 && (
                  <p className="comments-empty">No comments yet</p>
                )}
                {comments.map((comment) => (
                  <div key={comment.id} className="comment">
                    <div className="comment-header">
                      <span className="comment-author">{(comment as any).userName || 'User'}</span>
                      <span className="comment-time">{formatTime(comment.createdAt)}</span>
                    </div>
                    <p className="comment-content">{comment.content}</p>
                  </div>
                ))}
              </div>

              <div className="comment-input-row">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddComment()
                  }}
                  maxLength={2000}
                  disabled={isCommenting}
                />
                <button
                  className="btn btn-primary btn-small"
                  onClick={handleAddComment}
                  disabled={isCommenting || !commentInput.trim()}
                >
                  {isCommenting ? '...' : 'Post'}
                </button>
              </div>
              {commentError && <p className="form-error">{commentError}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
