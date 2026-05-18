import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Column } from '../components/Column'
import { useBoard } from '../hooks/useBoard'
import { useColumns } from '../hooks/useColumns'

export function Board() {
  const { boardId } = useParams()
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [columnError, setColumnError] = useState<string | null>(null)
  const [isCreatingColumn, setIsCreatingColumn] = useState(false)
  const { board, isLoading: boardLoading } = useBoard(boardId!)
  const { columns, isLoading: columnsLoading, error, createColumn, createCard } = useColumns(boardId!)

  const handleCreateColumn = async () => {
    if (!newColumnName.trim()) return

    setColumnError(null)
    setIsCreatingColumn(true)

    try {
      await createColumn(newColumnName.trim())
      setNewColumnName('')
      setShowAddColumn(false)
    } catch (err) {
      setColumnError(err instanceof Error ? err.message : 'Unable to create column')
    } finally {
      setIsCreatingColumn(false)
    }
  }

  if (boardLoading || columnsLoading) return <p>Loading...</p>

  return (
    <div className="container">
      <div className="board-header">
        <h1>{board?.name || 'Board'}</h1>
        {board?.description && <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>{board.description}</p>}
      </div>

      {error && <p className="page-error">{error}</p>}

      <div className="columns">
        {columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            onAddCard={(title) => createCard(column.id, title)}
          />
        ))}
        {showAddColumn ? (
          <div className="add-column-panel">
            <input
              type="text"
              placeholder="Column name"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateColumn()
                if (e.key === 'Escape') {
                  setShowAddColumn(false)
                  setNewColumnName('')
                  setColumnError(null)
                }
              }}
              maxLength={200}
              disabled={isCreatingColumn}
              autoFocus
            />
            {columnError && <p className="form-error">{columnError}</p>}
            <div className="inline-actions">
              <button className="btn btn-primary" onClick={handleCreateColumn} disabled={isCreatingColumn || !newColumnName.trim()}>
                {isCreatingColumn ? 'Adding...' : 'Add'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddColumn(false)
                  setNewColumnName('')
                  setColumnError(null)
                }}
                disabled={isCreatingColumn}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className="add-column-btn" onClick={() => setShowAddColumn(true)}>
            + Add column
          </button>
        )}
      </div>
    </div>
  )
}
