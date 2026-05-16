import { useState } from 'react'
import type { Column as ColumnType, Card } from '@group/shared'

interface Props {
  column: ColumnType
  onAddCard: (title: string) => void
  onMoveCard: (cardId: string, targetColumnId: string) => void
}

export function Column({ column, onAddCard, onMoveCard }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [newCardTitle, setNewCardTitle] = useState('')

  const handleAdd = () => {
    if (!newCardTitle.trim()) return
    onAddCard(newCardTitle.trim())
    setNewCardTitle('')
    setShowAdd(false)
  }

  return (
    <div className="column">
      <div className="column-header">
        <h3>{column.name}</h3>
        <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
          {column.cards?.length || 0}
        </span>
      </div>
      <div className="column-cards">
        {(column.cards || []).map((card: Card) => (
          <div
            key={card.id}
            className="card"
            draggable
            onDragEnd={() => {
              // Drag and drop to be implemented with proper DnD library
            }}
          >
            <div className="card-title">{card.title}</div>
            <div className="card-meta">
              {card.comments?.length
                ? `${card.comments.length} comment${card.comments.length !== 1 ? 's' : ''}`
                : 'No comments'}
            </div>
          </div>
        ))}
      </div>
      {showAdd ? (
        <div style={{ marginTop: '0.5rem' }}>
          <input
            type="text"
            placeholder="Card title"
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            autoFocus
            style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={handleAdd}>
              Add
            </button>
            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => { setShowAdd(false); setNewCardTitle('') }}>
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
