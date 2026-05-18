import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BoardCard } from '../components/BoardCard'
import { CreateBoardModal } from '../components/CreateBoardModal'
import { useBoards } from '../hooks/useBoards'

export function Home() {
  const [showModal, setShowModal] = useState(false)
  const { boards, isLoading, error, createBoard } = useBoards()

  return (
    <div className="container">
      <div className="header">
        <h1>My Boards</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + New Board
        </button>
      </div>

      {error && <p className="page-error">{error}</p>}

      {isLoading ? (
        <p>Loading...</p>
      ) : boards.length === 0 ? (
        <div className="empty-state">
          <h2>No boards yet</h2>
          <p>Create your first board to start organizing work.</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + New Board
          </button>
        </div>
      ) : (
        <div className="board-grid">
          {boards.map((board) => (
            <Link
              key={board.id}
              to={`/board/${board.id}`}
              className="board-card"
            >
              <BoardCard board={board} />
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <CreateBoardModal
          onClose={() => setShowModal(false)}
          onCreate={createBoard}
        />
      )}
    </div>
  )
}
