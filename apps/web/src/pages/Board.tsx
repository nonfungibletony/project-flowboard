import { useState, useCallback } from 'react'
import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import { useParams } from 'react-router-dom'
import { Column } from '../components/Column'
import { CardDetailModal } from '../components/CardDetailModal'
import { useBoard } from '../hooks/useBoard'
import { useColumns } from '../hooks/useColumns'
import { useCardDetail } from '../hooks/useCardDetail'
import type { Card } from '@group/shared'

export function Board() {
  const { boardId } = useParams()
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [columnError, setColumnError] = useState<string | null>(null)
  const [isCreatingColumn, setIsCreatingColumn] = useState(false)
  const [moveError, setMoveError] = useState<string | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  const { board, isLoading: boardLoading } = useBoard(boardId!)
  const { columns, isLoading: columnsLoading, error, createColumn, createCard, updateCard: updateCardInColumns, addComment: addCommentInColumns, moveCard } = useColumns(boardId!)
  const { card, comments, isLoading: detailLoading, error: detailError, updateCard, addComment } = useCardDetail(selectedCardId)

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

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, draggableId, source } = result
    console.log('[D&D] drag end:', { draggableId, source: source.droppableId, sourceIndex: source.index, destination: destination?.droppableId, destIndex: destination?.index })
    if (!destination) { console.log('[D&D] no destination, skipping'); return }
    if (destination.droppableId === source.droppableId && destination.index === source.index) { console.log('[D&D] dropped in same place, skipping'); return }

    setMoveError(null)

    try {
      await moveCard(draggableId, source.droppableId, destination.droppableId, destination.index)
    } catch (err) {
      console.error('[D&D] moveCard error:', err)
      setMoveError(err instanceof Error ? err.message : 'Unable to move card')
    }
  }, [moveCard])

  const handleCardClick = (card: Card) => {
    setSelectedCardId(card.id)
  }

  const handleCloseModal = () => {
    setSelectedCardId(null)
  }

  const handleUpdateCard = async (updates: { title?: string; description?: string }) => {
    if (!selectedCardId) return
    await updateCard(updates)
    await updateCardInColumns(selectedCardId, updates)
  }

  const handleAddComment = async (content: string) => {
    if (!selectedCardId) return
    await addComment(content)
    await addCommentInColumns(selectedCardId, content)
  }

  if (boardLoading || columnsLoading) return <p>Loading...</p>

  return (
    <div className="container">
      <div className="board-header">
        <h1>{board?.name || 'Board'}</h1>
        {board?.description && <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>{board.description}</p>}
      </div>

      {(error || moveError) && <p className="page-error">{moveError || error}</p>}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="columns">
          {columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              onAddCard={(title) => createCard(column.id, title)}
              onCardClick={handleCardClick}
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
      </DragDropContext>

      {selectedCardId && card && (
        <CardDetailModal
          card={card}
          comments={comments}
          isLoading={detailLoading}
          error={detailError}
          onClose={handleCloseModal}
          onUpdate={handleUpdateCard}
          onAddComment={handleAddComment}
        />
      )}
    </div>
  )
}
