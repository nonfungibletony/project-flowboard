import { useState } from 'react'
import { Draggable, Droppable } from '@hello-pangea/dnd'
import type { Column as ColumnType, Card } from '@group/shared'

interface Props {
  column: ColumnType
  index: number
  onAddCard: (title: string) => Promise<unknown>
  onCardClick: (card: Card) => void
  onDeleteColumn: (id: string) => Promise<void>
}

export function Column({ column, index, onAddCard, onCardClick, onDeleteColumn }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAdd = async () => {
    if (!newCardTitle.trim()) return

    setError(null)
    setIsSubmitting(true)

    try {
      await onAddCard(newCardTitle.trim())
      setNewCardTitle('')
      setShowAdd(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create card')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Draggable draggableId={`col-${column.id}`} index={index}>
      {(colProvided, colSnapshot) => (
        <div
          className={`column${colSnapshot.isDragging ? ' column-dragging' : ''}`}
          ref={colProvided.innerRef}
          {...colProvided.draggableProps}
        >
          <div className="column-header" {...colProvided.dragHandleProps}>
            <h3>{column.name}</h3>
            <div className="column-header-actions">
              <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                {column.cards?.length || 0}
              </span>
              <button
                className="column-delete-btn"
                onClick={() => {
                  if (window.confirm(`Delete column "${column.name}"? This cannot be undone.`)) {
                    onDeleteColumn(column.id)
                  }
                }}
                title="Delete column"
              >
                ×
              </button>
            </div>
          </div>
          <Droppable droppableId={column.id} type="CARD">
            {(provided, snapshot) => (
              <div
                className={`column-cards${snapshot.isDraggingOver ? ' column-cards-over' : ''}`}
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {(column.cards || []).map((card: Card, cardIndex: number) => (
                  <Draggable key={card.id} draggableId={card.id} index={cardIndex} isDragDisabled={card.id.startsWith('temp-')}>
                    {(dragProvided, dragSnapshot) => (
                      <div
                        className={`card${dragSnapshot.isDragging ? ' card-dragging' : ''}`}
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        onClick={() => onCardClick(card)}
                      >
                        <div className="card-title">{card.title}</div>
                        <div className="card-meta">
                          {card.comments?.length || 0} comment{(card.comments?.length || 0) !== 1 ? 's' : ''}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
          {showAdd ? (
            <div className="add-card-panel">
              <input
                id={`new-card-input-${column.id}`}
                type="text"
                placeholder="Card title"
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd()
                  if (e.key === 'Escape') {
                    setShowAdd(false)
                    setNewCardTitle('')
                    setError(null)
                  }
                }}
                maxLength={500}
                disabled={isSubmitting}
                autoFocus
              />
              {error && <p className="form-error">{error}</p>}
              <div className="inline-actions">
                <button className="btn btn-primary btn-small" onClick={handleAdd} disabled={isSubmitting || !newCardTitle.trim()}>
                  {isSubmitting ? 'Adding...' : 'Add'}
                </button>
                <button
                  className="btn btn-secondary btn-small"
                  onClick={() => {
                    setShowAdd(false)
                    setNewCardTitle('')
                    setError(null)
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button className="add-card-btn" onClick={() => setShowAdd(true)}>
              + Add a card
            </button>
          )}
        </div>
      )}
    </Draggable>
  )
}
