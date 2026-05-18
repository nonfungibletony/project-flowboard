import { useState } from 'react'
import type { Board } from '@group/shared'
import { BoardCard } from '../components/BoardCard'
import { CreateBoardModal } from '../components/CreateBoardModal'
import { DeleteBoardModal } from '../components/DeleteBoardModal'
import { useBoards } from '../hooks/useBoards'

export function Home() {
  const [showModal, setShowModal] = useState(false)
  const [boardToDelete, setBoardToDelete] = useState<Board | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { boards, isLoading, error, createBoard, deleteBoard } = useBoards()

  const handleDeleteBoard = async () => {
    if (!boardToDelete) return

    setDeleteError(null)
    setIsDeleting(true)

    try {
      await deleteBoard(boardToDelete.id)
      setBoardToDelete(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Unable to delete board')
    } finally {
      setIsDeleting(false)
    }
  }

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
            <BoardCard key={board.id} board={board} onDelete={() => setBoardToDelete(board)} />
          ))}
        </div>
      )}

      {showModal && (
        <CreateBoardModal
          onClose={() => setShowModal(false)}
          onCreate={createBoard}
        />
      )}

      {boardToDelete && (
        <DeleteBoardModal
          board={boardToDelete}
          error={deleteError}
          isDeleting={isDeleting}
          onCancel={() => {
            setBoardToDelete(null)
            setDeleteError(null)
          }}
          onConfirm={handleDeleteBoard}
        />
      )}
    </div>
  )
}
