import { useState, useCallback, useEffect } from 'react'
import type { Board } from '@group/shared'

interface Props {
  onClose: () => void
  onCreate: (name: string, description?: string) => Promise<Board | null | undefined>
}

export function CreateBoardModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isSubmitting, onClose])

  const handleClose = useCallback(() => {
    if (isSubmitting) return
    onClose()
  }, [isSubmitting, onClose])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!name.trim()) {
        setError('Board name is required')
        return
      }
      if (name.trim().length > 200) {
        setError('Board name must be 200 characters or less')
        return
      }
      setError(null)
      setIsSubmitting(true)
      try {
        const created = await onCreate(name.trim(), description.trim() || undefined)
        if (created) {
          setName('')
          setDescription('')
          onClose()
        } else {
          setError('Failed to create board. Please try again.')
        }
      } catch {
        setError('An unexpected error occurred.')
      } finally {
        setIsSubmitting(false)
      }
    },
    [name, description, onCreate, onClose]
  )

  return (
    <div
      className="modal-overlay"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-board-title"
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 id="create-board-title">Create New Board</h2>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="board-name">
              Board Name <span className="required-asterisk">*</span>
            </label>
            <input
              id="board-name"
              type="text"
              placeholder="e.g. Product Roadmap"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError(null)
              }}
              autoFocus
              maxLength={200}
              aria-describedby={error ? 'board-error' : undefined}
              aria-invalid={!!error}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="board-desc">Description (optional)</label>
            <textarea
              id="board-desc"
              placeholder="What's this board for?"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                if (error) setError(null)
              }}
              maxLength={500}
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <p id="board-error" className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
