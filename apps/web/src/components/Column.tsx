import { useState } from 'react'
import { Draggable, Droppable } from '@hello-pangea/dnd'
import type { Column as ColumnType, Card, Label } from '@group/shared'
import { DeleteCardModal } from './DeleteCardModal'

interface Props {
  column: ColumnType
  labels: Label[]
  onAddCard: (title: string) => Promise<unknown>
  onDeleteCard: (cardId: string) => Promise<unknown>
  onCreateLabel: (name: string, colour: string) => Promise<Label>
  onSetCardLabels: (cardId: string, labelIds: string[]) => Promise<unknown>
  onSetCardDueDate: (cardId: string, dueDate: string | null) => Promise<unknown>
}

const LABEL_COLOURS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']

export function Column({ column, labels, onAddCard, onDeleteCard, onCreateLabel, onSetCardLabels, onSetCardDueDate }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cardToDelete, setCardToDelete] = useState<Card | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [labelCard, setLabelCard] = useState<Card | null>(null)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColour, setNewLabelColour] = useState(LABEL_COLOURS[0])
  const [labelError, setLabelError] = useState<string | null>(null)
  const [isSavingLabels, setIsSavingLabels] = useState(false)
  const [dueDateCard, setDueDateCard] = useState<Card | null>(null)
  const [dueDateValue, setDueDateValue] = useState('')
  const [dueDateError, setDueDateError] = useState<string | null>(null)
  const [isSavingDueDate, setIsSavingDueDate] = useState(false)

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

  const handleDeleteCard = async () => {
    if (!cardToDelete) return

    setDeleteError(null)
    setIsDeleting(true)

    try {
      await onDeleteCard(cardToDelete.id)
      setCardToDelete(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Unable to delete card')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleLabel = async (label: Label) => {
    if (!labelCard) return

    const currentLabels = labelCard.labels || []
    const hasLabel = currentLabels.some((current) => current.id === label.id)
    const nextLabels = hasLabel
      ? currentLabels.filter((current) => current.id !== label.id)
      : [...currentLabels, label]

    setLabelError(null)
    setIsSavingLabels(true)

    try {
      await onSetCardLabels(labelCard.id, nextLabels.map((current) => current.id))
      setLabelCard({ ...labelCard, labels: nextLabels })
    } catch (err) {
      setLabelError(err instanceof Error ? err.message : 'Unable to update labels')
    } finally {
      setIsSavingLabels(false)
    }
  }

  const handleCreateLabel = async () => {
    if (!labelCard || !newLabelName.trim()) return

    setLabelError(null)
    setIsSavingLabels(true)

    try {
      const label = await onCreateLabel(newLabelName.trim(), newLabelColour)
      const nextLabels = [...(labelCard.labels || []), label]
      await onSetCardLabels(labelCard.id, nextLabels.map((current) => current.id))
      setLabelCard({ ...labelCard, labels: nextLabels })
      setNewLabelName('')
    } catch (err) {
      setLabelError(err instanceof Error ? err.message : 'Unable to create label')
    } finally {
      setIsSavingLabels(false)
    }
  }

  const openDueDatePicker = (card: Card) => {
    setDueDateCard(card)
    setDueDateValue(formatDateInput(card.dueDate))
    setDueDateError(null)
  }

  const handleSaveDueDate = async (dueDate: string | null) => {
    if (!dueDateCard) return

    setDueDateError(null)
    setIsSavingDueDate(true)

    try {
      await onSetCardDueDate(dueDateCard.id, dueDate)
      setDueDateCard({ ...dueDateCard, dueDate })
      setDueDateValue(formatDateInput(dueDate))
      if (dueDate === null) setDueDateCard(null)
    } catch (err) {
      setDueDateError(err instanceof Error ? err.message : 'Unable to update due date')
    } finally {
      setIsSavingDueDate(false)
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
                    <div className="card-main">
                      <div>
                        {!!card.labels?.length && (
                          <div className="card-labels">
                            {card.labels.map((label) => (
                              <span key={label.id} className="card-label-chip" style={{ backgroundColor: label.colour }}>
                                {label.name}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="card-title">{card.title}</div>
                        <div className="card-meta">
                          {card.comments?.length || 0} comment{(card.comments?.length || 0) !== 1 ? 's' : ''}
                        </div>
                        {card.dueDate && (
                          <span className={`due-date-badge ${getDueDateStatus(card.dueDate)}`}>
                            {formatDueDate(card.dueDate)}
                          </span>
                        )}
                      </div>
                      {!card.id.startsWith('temp-') && (
                        <div className="card-actions">
                          <button
                            type="button"
                            className="card-action-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              openDueDatePicker(card)
                            }}
                          >
                            Due
                          </button>
                          <button
                            type="button"
                            className="card-action-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              setLabelCard(card)
                              setLabelError(null)
                            }}
                          >
                            Labels
                          </button>
                          <button
                            type="button"
                            className="card-action-btn card-delete-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              setCardToDelete(card)
                              setDeleteError(null)
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
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
      {cardToDelete && (
        <DeleteCardModal
          card={cardToDelete}
          error={deleteError}
          isDeleting={isDeleting}
          onCancel={() => {
            setCardToDelete(null)
            setDeleteError(null)
          }}
          onConfirm={handleDeleteCard}
        />
      )}
      {labelCard && (
        <div className="modal-overlay" onClick={isSavingLabels ? undefined : () => setLabelCard(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Card labels</h2>
            <p className="modal-copy">{labelCard.title}</p>
            <div className="label-picker-list">
              {labels.map((label) => {
                const selected = labelCard.labels?.some((current) => current.id === label.id)
                return (
                  <button
                    key={label.id}
                    type="button"
                    className={`label-picker-row${selected ? ' label-picker-row-selected' : ''}`}
                    onClick={() => handleToggleLabel(label)}
                    disabled={isSavingLabels}
                  >
                    <span className="label-colour" style={{ backgroundColor: label.colour }} />
                    <span>{label.name}</span>
                  </button>
                )
              })}
            </div>
            <div className="label-create">
              <input
                type="text"
                placeholder="New label"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                maxLength={100}
                disabled={isSavingLabels}
              />
              <div className="label-colour-options">
                {LABEL_COLOURS.map((colour) => (
                  <button
                    key={colour}
                    type="button"
                    className={`label-colour-option${newLabelColour === colour ? ' label-colour-option-selected' : ''}`}
                    style={{ backgroundColor: colour }}
                    onClick={() => setNewLabelColour(colour)}
                    disabled={isSavingLabels}
                    aria-label={`Use ${colour}`}
                  />
                ))}
              </div>
              <button type="button" className="btn btn-primary" onClick={handleCreateLabel} disabled={isSavingLabels || !newLabelName.trim()}>
                Create label
              </button>
            </div>
            {labelError && <p className="form-error">{labelError}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setLabelCard(null)} disabled={isSavingLabels}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {dueDateCard && (
        <div className="modal-overlay" onClick={isSavingDueDate ? undefined : () => setDueDateCard(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Due date</h2>
            <p className="modal-copy">{dueDateCard.title}</p>
            <input
              type="date"
              value={dueDateValue}
              onChange={(e) => setDueDateValue(e.target.value)}
              disabled={isSavingDueDate}
            />
            {dueDateError && <p className="form-error">{dueDateError}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => handleSaveDueDate(null)} disabled={isSavingDueDate || !dueDateCard.dueDate}>
                Clear
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setDueDateCard(null)} disabled={isSavingDueDate}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleSaveDueDate(dueDateValue ? new Date(`${dueDateValue}T12:00:00`).toISOString() : null)}
                disabled={isSavingDueDate}
              >
                {isSavingDueDate ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatDateInput(value?: string | null) {
  if (!value) return ''
  return value.slice(0, 10)
}

function formatDueDate(value: string) {
  const date = new Date(value)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function getDueDateStatus(value: string) {
  const due = new Date(value)
  const today = new Date()
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime()
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()

  if (dueDay < todayDay) return 'due-date-overdue'
  if (dueDay === todayDay) return 'due-date-today'
  return 'due-date-upcoming'
}
