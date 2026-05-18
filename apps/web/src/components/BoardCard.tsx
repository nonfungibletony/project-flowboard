import type { Board } from '@group/shared'
import { Link } from 'react-router-dom'

interface Props {
  board: Board
}

export function BoardCard({ board }: Props) {
  const updatedAt = new Date(board.updatedAt)
  const now = new Date()
  const dayDiff = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24))

  let timeLabel: string
  if (dayDiff === 0) timeLabel = 'Today'
  else if (dayDiff === 1) timeLabel = 'Yesterday'
  else if (dayDiff < 30) timeLabel = `${dayDiff} days ago`
  else timeLabel = updatedAt.toLocaleDateString()

  return (
    <Link
      to={`/board/${board.id}`}
      className="board-card"
      aria-label={`Open board: ${board.name}`}
    >
      <div className="board-card-header">
        <h3>{board.name}</h3>
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
  )
}
