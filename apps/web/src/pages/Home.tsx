import { useState } from 'react'
import { BoardCard } from '../components/BoardCard'
import { CreateBoardModal } from '../components/CreateBoardModal'
import { useBoards } from '../hooks/useBoards'

export function Home() {
  const [showModal, setShowModal] = useState(false)
  const { boards, isLoading, error, createBoard, isCreating } = useBoards()

  const handleCreate = async (name: string, description?: string) => {
    const result = await createBoard(name, description)
    return result
  }

  return (
    <div className="container">
      <div className="header">
        <h1>My Boards</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            setShowModal(true)
          }}
          disabled={isCreating}
        >
          + New Board
        </button>
      </div>

      {isLoading ? (
        <div className="loading-state">
          <p>Loading your boards…</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <p>⚠️ {error.message}</p>
          <button className="btn btn-secondary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      ) : boards.length === 0 ? (
        <div className="empty-state">
          <p>No boards yet.</p>
          <p>Click “+ New Board” to get started.</p>
        </div>
      ) : (
        <div className="board-grid">
          {boards.map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </div>
      )}

      {showModal && (
        <CreateBoardModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
