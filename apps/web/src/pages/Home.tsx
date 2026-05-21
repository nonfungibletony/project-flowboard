import { useState, useEffect } from 'react'
import { BoardCard } from '../components/BoardCard'
import { CreateBoardModal } from '../components/CreateBoardModal'
import { ShortcutHelpModal } from '../components/ShortcutHelpModal'
import { useBoards } from '../hooks/useBoards'
import { isTypingTarget } from '../utils/keyboard'

export function Home() {
  const [showModal, setShowModal] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const { boards, isLoading, error, refresh, createBoard, updateBoard, deleteBoard, isCreating } = useBoards()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault()
        setShowModal(true)
      }
      if (e.key === '?') {
        e.preventDefault()
        setShowShortcuts(true)
      }
      if (e.key === 'Escape') {
        setShowModal(false)
        setShowShortcuts(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleCreate = async (name: string, description?: string, backgroundColour?: string | null) => {
    const result = await createBoard(name, description, backgroundColour)
    return result
  }

  const visibleBoards = showArchived
    ? boards
    : boards.filter((b) => b.archived !== 1)

  return (
    <div className="container">
      <div className="header">
        <h1>My Boards ({visibleBoards.length})</h1>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => {
              setShowArchived((prev) => !prev)
              // refetch with archived included when toggling on
              if (!showArchived) void refresh()
            }}
          >
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </button>
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
      ) : visibleBoards.length === 0 ? (
        <div className="empty-state">
          <p>No boards yet.</p>
          <p>Click “+ New Board” to get started.</p>
        </div>
      ) : (
        <div className="board-grid">
          {visibleBoards.map((board) => (
            <BoardCard
              key={board.id}
              board={board}
              onRename={(id, name, desc) => updateBoard(id, { name, description: desc })}
              onArchive={(id, archived) => updateBoard(id, { archived: archived ? 1 : 0 })}
              onDelete={(id) => deleteBoard(id)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <CreateBoardModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}

      {showShortcuts && (
        <ShortcutHelpModal onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  )
}
