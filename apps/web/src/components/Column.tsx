import { useState } from 'react'
import { Draggable, Droppable } from '@hello-pangea/dnd'
import type { Column as ColumnType, Card } from '@group/shared'

interface Props {
  column: ColumnType
  onAddCard: (title: string) => Promise<unknown>
}

export function Column({ column, onAddCard }: Props) {
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
    <div className="column">
      <div className="column-header">
        <h3>{column.name}</h3>
        <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
          {column.cards?.length || 0}
        </span>
      </div>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            className={`column-cards${snapshot.isDraggingOver ? ' column-cards-over' : ''}`}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {(column.cards || []).map((card: Card, index) => (
              <Draggable key={card.id} draggableId={card.id} index={index} isDragDisabled={card.id.startsWith('temp-')}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    className={`card${dragSnapshot.isDragging ? ' card-dragging' : ''}`}
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
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
  )
}
