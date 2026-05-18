import { useState, useEffect, useRef } from 'react'
import type { Card, Comment } from '@group/shared'

interface Props {
  card: Card
  comments: Comment[]
  isLoading: boolean
  error: string | null
  onClose: () => void
  onUpdate: (updates: { title?: string; description?: string }) => Promise<void>
  onAddComment: (content: string) => Promise<void>
}

export function CardDetailModal({ card, comments, isLoading, error, onClose, onUpdate, onAddComment }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description || '')
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [commentInput, setCommentInput] = useState('')
  const [commentError, setCommentError] = useState<string | null>(null)
  const [isCommenting, setIsCommenting] = useState(false)

  const overlayRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTitle(card.title)
    setDescription(card.description || '')
  }, [card.id, card.title, card.description])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

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

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

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
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </button>
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
