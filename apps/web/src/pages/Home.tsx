import { useEffect, useState } from 'react'
import type { Board } from '@group/shared'
import { BoardCard } from '../components/BoardCard'
import { CreateBoardModal } from '../components/CreateBoardModal'
import { DeleteBoardModal } from '../components/DeleteBoardModal'
import { useBoards } from '../hooks/useBoards'
import { isTypingTarget } from '../utils/keyboard'

export function Home() {
  const [showModal, setShowModal] = useState(false)
  const [boardToDelete, setBoardToDelete] = useState<Board | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const { boards, templates, isLoading, error, createBoard, deleteBoard, toggleStarred } = useBoards()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowShortcuts(false)
        setShowModal(false)
        setBoardToDelete(null)
        return
      }

      if (isTypingTarget(event.target)) return

      if (event.key === '?') {
        event.preventDefault()
        setShowShortcuts(true)
        return
      }

      if (event.key.toLowerCase() === 'b') {
        event.preventDefault()
        setShowModal(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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
            <BoardCard
              key={board.id}
              board={board}
              onDelete={() => setBoardToDelete(board)}
              onToggleStarred={() => toggleStarred(board.id, !board.starred)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <CreateBoardModal
          onClose={() => setShowModal(false)}
          onCreate={createBoard}
          templates={templates}
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

      {showShortcuts && <ShortcutHelp onClose={() => setShowShortcuts(false)} />}
    </div>
  )
}

function ShortcutHelp({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    ['B', 'New board'],
    ['?', 'Show shortcuts'],
    ['Esc', 'Close modal'],
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal shortcut-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Keyboard shortcuts</h2>
        <div className="shortcut-list">
          {shortcuts.map(([keys, description]) => (
            <div key={keys} className="shortcut-row">
              <kbd>{keys}</kbd>
              <span>{description}</span>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
