import { Link } from 'react-router-dom'
import type { Board } from '@group/shared'

interface Props {
  board: Board
  onDelete: () => void
}

export function BoardCard({ board, onDelete }: Props) {
  return (
    <article className="board-card">
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
