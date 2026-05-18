import type { Board } from '@group/shared'

interface Props {
  board: Board
  error: string | null
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteBoardModal({ board, error, isDeleting, onCancel, onConfirm }: Props) {
  return (
    <div className="modal-overlay" onClick={isDeleting ? undefined : onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Delete board</h2>
        <p className="modal-copy">
          Delete "{board.name}"? This will permanently delete its columns, cards, and comments.
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
