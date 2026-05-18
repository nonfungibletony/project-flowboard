import type { Card } from '@group/shared'

interface Props {
  card: Card
  error: string | null
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteCardModal({ card, error, isDeleting, onCancel, onConfirm }: Props) {
  return (
    <div className="modal-overlay" onClick={isDeleting ? undefined : onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Delete card</h2>
        <p className="modal-copy">
          Delete "{card.title}"? This will permanently delete its comments.
        </p>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
