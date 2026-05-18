import { Link } from 'react-router-dom'
import type { Board } from '@group/shared'

interface Props {
  board: Board
  onDelete: () => void
  onToggleStarred: () => void
}

export function BoardCard({ board, onDelete, onToggleStarred }: Props) {
  return (
    <article className="board-card">
      <button
        type="button"
        className={`board-star-btn${board.starred ? ' board-star-btn-active' : ''}`}
        onClick={onToggleStarred}
        aria-label={board.starred ? 'Unstar board' : 'Star board'}
      >
        {board.starred ? '★' : '☆'}
      </button>
      <Link to={`/board/${board.id}`} className="board-card-link">
        <h3>{board.name}</h3>
        {board.description && <p>{board.description}</p>}
        <p>Updated {new Date(board.updatedAt).toLocaleDateString()}</p>
      </Link>
      <button type="button" className="board-delete-btn" onClick={onDelete}>
        Delete
      </button>
    </article>
  )
}
