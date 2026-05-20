import { useState } from 'react'
import { Draggable, Droppable, type DraggableProvidedDragHandleProps } from '@hello-pangea/dnd'
import type { Attachment, Checklist, ChecklistItem, Column as ColumnType, Card, Label } from '@group/shared'
import { DeleteCardModal } from './DeleteCardModal'

interface Props {
  column: ColumnType
  labels: Label[]
  canEdit: boolean
  canDrag: boolean
  searchTerm: string
  columnDragHandleProps?: DraggableProvidedDragHandleProps | null
  onAddCard: (title: string) => Promise<unknown>
  onDeleteCard: (cardId: string) => Promise<unknown>
  onCreateLabel: (name: string, colour: string) => Promise<Label>
  onSetCardLabels: (cardId: string, labelIds: string[]) => Promise<unknown>
  onSetCardDueDate: (cardId: string, dueDate: string | null) => Promise<unknown>
  onGetCardAttachments: (cardId: string) => Promise<Attachment[]>
  onUploadCardAttachment: (cardId: string, file: File) => Promise<Attachment>
  onDeleteCardAttachment: (cardId: string, attachmentId: string) => Promise<unknown>
  onGetCardChecklists: (cardId: string) => Promise<Checklist[]>
  onCreateChecklist: (cardId: string, title: string) => Promise<Checklist>
  onDeleteChecklist: (cardId: string, checklistId: string) => Promise<unknown>
  onCreateChecklistItem: (cardId: string, checklistId: string, content: string) => Promise<ChecklistItem>
  onUpdateChecklistItem: (cardId: string, checklistId: string, itemId: string, updates: Partial<Pick<ChecklistItem, 'content' | 'completed' | 'order'>>) => Promise<ChecklistItem>
  onReorderChecklistItems: (cardId: string, checklistId: string, sourceIndex: number, targetIndex: number) => Promise<ChecklistItem[]>
  onDeleteChecklistItem: (cardId: string, checklistId: string, itemId: string) => Promise<unknown>
}

const LABEL_COLOURS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']

export function Column({ column, labels, canEdit, canDrag, searchTerm, columnDragHandleProps, onAddCard, onDeleteCard, onCreateLabel, onSetCardLabels, onSetCardDueDate, onGetCardAttachments, onUploadCardAttachment, onDeleteCardAttachment, onGetCardChecklists, onCreateChecklist, onDeleteChecklist, onCreateChecklistItem, onUpdateChecklistItem, onReorderChecklistItems, onDeleteChecklistItem }: Props) {
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
  const [attachmentCard, setAttachmentCard] = useState<Card | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false)
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null)
  const [checklistCard, setChecklistCard] = useState<Card | null>(null)
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [newChecklistTitle, setNewChecklistTitle] = useState('')
  const [newItemContent, setNewItemContent] = useState<Record<string, string>>({})
  const [checklistError, setChecklistError] = useState<string | null>(null)
  const [isLoadingChecklists, setIsLoadingChecklists] = useState(false)
  const [isSavingChecklist, setIsSavingChecklist] = useState(false)

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

  const openAttachments = async (card: Card) => {
    setAttachmentCard(card)
    setAttachments(card.attachments || [])
    setAttachmentError(null)
    setIsLoadingAttachments(true)

    try {
      const loaded = await onGetCardAttachments(card.id)
      setAttachments(loaded)
      setAttachmentCard({ ...card, attachments: loaded })
    } catch (err) {
      setAttachmentError(err instanceof Error ? err.message : 'Unable to load attachments')
    } finally {
      setIsLoadingAttachments(false)
    }
  }

  const handleUploadAttachment = async (file: File | undefined) => {
    if (!attachmentCard || !file) return

    setAttachmentError(null)
    setIsUploadingAttachment(true)

    try {
      const attachment = await onUploadCardAttachment(attachmentCard.id, file)
      const nextAttachments = [...attachments, attachment]
      setAttachments(nextAttachments)
      setAttachmentCard({ ...attachmentCard, attachments: nextAttachments })
    } catch (err) {
      setAttachmentError(err instanceof Error ? err.message : 'Unable to upload attachment')
    } finally {
      setIsUploadingAttachment(false)
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!attachmentCard) return

    setAttachmentError(null)
    setDeletingAttachmentId(attachmentId)

    try {
      await onDeleteCardAttachment(attachmentCard.id, attachmentId)
      const nextAttachments = attachments.filter((attachment) => attachment.id !== attachmentId)
      setAttachments(nextAttachments)
      setAttachmentCard({ ...attachmentCard, attachments: nextAttachments })
    } catch (err) {
      setAttachmentError(err instanceof Error ? err.message : 'Unable to delete attachment')
    } finally {
      setDeletingAttachmentId(null)
    }
  }

  const openChecklists = async (card: Card) => {
    setChecklistCard(card)
    setChecklists(card.checklists || [])
    setChecklistError(null)
    setIsLoadingChecklists(true)

    try {
      const loaded = await onGetCardChecklists(card.id)
      setChecklists(loaded)
      setChecklistCard({ ...card, checklists: loaded })
    } catch (err) {
      setChecklistError(err instanceof Error ? err.message : 'Unable to load checklists')
    } finally {
      setIsLoadingChecklists(false)
    }
  }

  const handleCreateChecklist = async () => {
    if (!checklistCard || !newChecklistTitle.trim()) return

    setChecklistError(null)
    setIsSavingChecklist(true)

    try {
      const checklist = await onCreateChecklist(checklistCard.id, newChecklistTitle.trim())
      const nextChecklists = [...checklists, checklist]
      setChecklists(nextChecklists)
      setChecklistCard({ ...checklistCard, checklists: nextChecklists })
      setNewChecklistTitle('')
    } catch (err) {
      setChecklistError(err instanceof Error ? err.message : 'Unable to create checklist')
    } finally {
      setIsSavingChecklist(false)
    }
  }

  const handleDeleteChecklist = async (checklistId: string) => {
    if (!checklistCard) return

    setChecklistError(null)
    setIsSavingChecklist(true)

    try {
      await onDeleteChecklist(checklistCard.id, checklistId)
      const nextChecklists = checklists.filter((checklist) => checklist.id !== checklistId)
      setChecklists(nextChecklists)
      setChecklistCard({ ...checklistCard, checklists: nextChecklists })
    } catch (err) {
      setChecklistError(err instanceof Error ? err.message : 'Unable to delete checklist')
    } finally {
      setIsSavingChecklist(false)
    }
  }

  const handleCreateChecklistItem = async (checklistId: string) => {
    if (!checklistCard || !newItemContent[checklistId]?.trim()) return

    setChecklistError(null)
    setIsSavingChecklist(true)

    try {
      const item = await onCreateChecklistItem(checklistCard.id, checklistId, newItemContent[checklistId].trim())
      const nextChecklists = updateChecklistList(checklists, checklistId, (checklist) => ({ ...checklist, items: [...(checklist.items || []), item] }))
      setChecklists(nextChecklists)
      setChecklistCard({ ...checklistCard, checklists: nextChecklists })
      setNewItemContent({ ...newItemContent, [checklistId]: '' })
    } catch (err) {
      setChecklistError(err instanceof Error ? err.message : 'Unable to add checklist item')
    } finally {
      setIsSavingChecklist(false)
    }
  }

  const handleToggleChecklistItem = async (checklistId: string, item: ChecklistItem) => {
    if (!checklistCard) return

    setChecklistError(null)

    try {
      const savedItem = await onUpdateChecklistItem(checklistCard.id, checklistId, item.id, { completed: !item.completed })
      const nextChecklists = updateChecklistList(checklists, checklistId, (checklist) => ({
        ...checklist,
        items: (checklist.items || []).map((current) => current.id === item.id ? savedItem : current),
      }))
      setChecklists(nextChecklists)
      setChecklistCard({ ...checklistCard, checklists: nextChecklists })
    } catch (err) {
      setChecklistError(err instanceof Error ? err.message : 'Unable to update checklist item')
    }
  }

  const handleMoveChecklistItem = async (checklistId: string, sourceIndex: number, targetIndex: number) => {
    if (!checklistCard) return

    setChecklistError(null)
    setIsSavingChecklist(true)

    try {
      const items = await onReorderChecklistItems(checklistCard.id, checklistId, sourceIndex, targetIndex)
      const nextChecklists = updateChecklistList(checklists, checklistId, (checklist) => ({ ...checklist, items }))
      setChecklists(nextChecklists)
      setChecklistCard({ ...checklistCard, checklists: nextChecklists })
    } catch (err) {
      setChecklistError(err instanceof Error ? err.message : 'Unable to reorder checklist items')
    } finally {
      setIsSavingChecklist(false)
    }
  }

  const handleDeleteChecklistItem = async (checklistId: string, itemId: string) => {
    if (!checklistCard) return

    setChecklistError(null)
    setIsSavingChecklist(true)

    try {
      await onDeleteChecklistItem(checklistCard.id, checklistId, itemId)
      const nextChecklists = updateChecklistList(checklists, checklistId, (checklist) => ({
        ...checklist,
        items: (checklist.items || []).filter((item) => item.id !== itemId),
      }))
      setChecklists(nextChecklists)
      setChecklistCard({ ...checklistCard, checklists: nextChecklists })
    } catch (err) {
      setChecklistError(err instanceof Error ? err.message : 'Unable to delete checklist item')
    } finally {
      setIsSavingChecklist(false)
    }
  }

  return (
    <div className="column">
      <div className={`column-header${columnDragHandleProps ? ' column-header-draggable' : ''}`} {...columnDragHandleProps}>
        <h3>{column.name}</h3>
        <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
          {column.cards?.length || 0}
        </span>
      </div>
      <Droppable droppableId={column.id} type="CARD">
        {(provided, snapshot) => (
          <div
            className={`column-cards${snapshot.isDraggingOver ? ' column-cards-over' : ''}`}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {(column.cards || []).map((card: Card, index) => (
              <Draggable key={card.id} draggableId={card.id} index={index} isDragDisabled={!canDrag || card.id.startsWith('temp-')}>
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
                                {highlightText(label.name, searchTerm)}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="card-title">{highlightText(card.title, searchTerm)}</div>
                        {getDescriptionMatch(card, searchTerm) && (
                          <div className="card-description-match">
                            {highlightText(getDescriptionMatch(card, searchTerm)!, searchTerm)}
                          </div>
                        )}
                        <div className="card-meta">
                          {card.comments?.length || 0} comment{(card.comments?.length || 0) !== 1 ? 's' : ''}
                          {!!card.attachments?.length && (
                            <>
                              {' · '}
                              {card.attachments.length} file{card.attachments.length !== 1 ? 's' : ''}
                            </>
                          )}
                        </div>
                        {getChecklistProgress(card).total > 0 && (
                          <div className="checklist-progress">
                            <div className="checklist-progress-meta">
                              <span>{getChecklistProgress(card).completed}/{getChecklistProgress(card).total}</span>
                              <span>{Math.round((getChecklistProgress(card).completed / getChecklistProgress(card).total) * 100)}%</span>
                            </div>
                            <div className="checklist-progress-track">
                              <span style={{ width: `${(getChecklistProgress(card).completed / getChecklistProgress(card).total) * 100}%` }} />
                            </div>
                          </div>
                        )}
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
                              openAttachments(card)
                            }}
                          >
                            Files
                          </button>
                          <button
                            type="button"
                            className="card-action-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              openChecklists(card)
                            }}
                          >
                            Tasks
                          </button>
                          {canEdit && (
                            <>
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
                            </>
                          )}
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
      {canEdit && showAdd ? (
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
      ) : canEdit ? (
        <button className="add-card-btn" onClick={() => setShowAdd(true)}>
          + Add a card
        </button>
      ) : null}
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
      {attachmentCard && (
        <div className="modal-overlay" onClick={isUploadingAttachment || deletingAttachmentId ? undefined : () => setAttachmentCard(null)}>
          <div className="modal attachment-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Attachments</h2>
            <p className="modal-copy">{attachmentCard.title}</p>
            {canEdit && (
              <label className="attachment-upload">
                <span>{isUploadingAttachment ? 'Uploading...' : 'Choose file'}</span>
                <input
                  type="file"
                  onChange={(e) => {
                    handleUploadAttachment(e.target.files?.[0])
                    e.target.value = ''
                  }}
                  disabled={isUploadingAttachment}
                />
              </label>
            )}
            {attachmentError && <p className="form-error">{attachmentError}</p>}
            {isLoadingAttachments ? (
              <p className="modal-copy">Loading files...</p>
            ) : attachments.length ? (
              <div className="attachment-list">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="attachment-row">
                    {attachment.mimeType.startsWith('image/') ? (
                      <img className="attachment-preview" src={attachment.fileUrl} alt={attachment.fileName} />
                    ) : (
                      <div className="attachment-file-icon">{getFileInitials(attachment.fileName)}</div>
                    )}
                    <div className="attachment-info">
                      <a href={attachment.fileUrl} target="_blank" rel="noreferrer">
                        {attachment.fileName}
                      </a>
                      <span>{formatFileSize(attachment.fileSize)}</span>
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        className="card-action-btn card-delete-btn"
                        onClick={() => handleDeleteAttachment(attachment.id)}
                        disabled={deletingAttachmentId === attachment.id}
                      >
                        {deletingAttachmentId === attachment.id ? 'Deleting...' : 'Delete'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="modal-copy">No files attached.</p>
            )}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setAttachmentCard(null)} disabled={isUploadingAttachment || !!deletingAttachmentId}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {checklistCard && (
        <div className="modal-overlay" onClick={isSavingChecklist ? undefined : () => setChecklistCard(null)}>
          <div className="modal checklist-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Checklists</h2>
            <p className="modal-copy">{checklistCard.title}</p>
            {canEdit && (
              <div className="checklist-create">
                <input
                  type="text"
                  placeholder="Checklist title"
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  maxLength={200}
                  disabled={isSavingChecklist}
                />
                <button type="button" className="btn btn-primary" onClick={handleCreateChecklist} disabled={isSavingChecklist || !newChecklistTitle.trim()}>
                  Add checklist
                </button>
              </div>
            )}
            {checklistError && <p className="form-error">{checklistError}</p>}
            {isLoadingChecklists ? (
              <p className="modal-copy">Loading checklists...</p>
            ) : checklists.length ? (
              <div className="checklist-list">
                {checklists.map((checklist) => {
                  const progress = getChecklistProgress({ ...checklistCard, checklists: [checklist] })
                  return (
                    <section key={checklist.id} className="checklist-section">
                      <div className="checklist-section-header">
                        <div>
                          <h3>{checklist.title}</h3>
                          <span>{progress.completed}/{progress.total} complete</span>
                        </div>
                        {canEdit && (
                          <button type="button" className="card-action-btn card-delete-btn" onClick={() => handleDeleteChecklist(checklist.id)} disabled={isSavingChecklist}>
                            Delete
                          </button>
                        )}
                      </div>
                      <div className="checklist-items">
                        {(checklist.items || []).map((item, index) => (
                          <div key={item.id} className="checklist-item-row">
                            <label>
                              <input
                                type="checkbox"
                                checked={item.completed}
                                onChange={() => handleToggleChecklistItem(checklist.id, item)}
                                disabled={!canEdit}
                              />
                              <span className={item.completed ? 'checklist-item-completed' : ''}>{item.content}</span>
                            </label>
                            {canEdit && (
                              <div className="checklist-item-actions">
                                <button type="button" className="card-action-btn" onClick={() => handleMoveChecklistItem(checklist.id, index, index - 1)} disabled={isSavingChecklist || index === 0}>
                                  Up
                                </button>
                                <button type="button" className="card-action-btn" onClick={() => handleMoveChecklistItem(checklist.id, index, index + 1)} disabled={isSavingChecklist || index === (checklist.items || []).length - 1}>
                                  Down
                                </button>
                                <button type="button" className="card-action-btn card-delete-btn" onClick={() => handleDeleteChecklistItem(checklist.id, item.id)} disabled={isSavingChecklist}>
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {canEdit && (
                        <div className="checklist-item-create">
                          <input
                            type="text"
                            placeholder="Add an item"
                            value={newItemContent[checklist.id] || ''}
                            onChange={(e) => setNewItemContent({ ...newItemContent, [checklist.id]: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCreateChecklistItem(checklist.id)
                            }}
                            maxLength={500}
                            disabled={isSavingChecklist}
                          />
                          <button type="button" className="btn btn-secondary btn-small" onClick={() => handleCreateChecklistItem(checklist.id)} disabled={isSavingChecklist || !newItemContent[checklist.id]?.trim()}>
                            Add
                          </button>
                        </div>
                      )}
                    </section>
                  )
                })}
              </div>
            ) : (
              <p className="modal-copy">No checklists yet.</p>
            )}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setChecklistCard(null)} disabled={isSavingChecklist}>
                Done
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

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function getFileInitials(fileName: string) {
  const ext = fileName.split('.').pop()
  return (ext || 'file').slice(0, 3).toUpperCase()
}

function highlightText(value: string, searchTerm: string) {
  if (!searchTerm) return value

  const lowerValue = value.toLowerCase()
  const index = lowerValue.indexOf(searchTerm)
  if (index === -1) return value

  const before = value.slice(0, index)
  const match = value.slice(index, index + searchTerm.length)
  const after = value.slice(index + searchTerm.length)

  return (
    <>
      {before}
      <mark className="search-highlight">{match}</mark>
      {after}
    </>
  )
}

function getDescriptionMatch(card: Card, searchTerm: string) {
  if (!searchTerm || !card.description) return null

  const index = card.description.toLowerCase().indexOf(searchTerm)
  if (index === -1) return null

  const start = Math.max(0, index - 36)
  const end = Math.min(card.description.length, index + searchTerm.length + 36)
  const prefix = start > 0 ? '...' : ''
  const suffix = end < card.description.length ? '...' : ''

  return `${prefix}${card.description.slice(start, end)}${suffix}`
}

function getChecklistProgress(card: Card | { checklists?: Checklist[] }) {
  const items = (card.checklists || []).flatMap((checklist) => checklist.items || [])
  return {
    completed: items.filter((item) => item.completed).length,
    total: items.length,
  }
}

function updateChecklistList(checklists: Checklist[], checklistId: string, updater: (checklist: Checklist) => Checklist) {
  return checklists.map((checklist) => checklist.id === checklistId ? updater(checklist) : checklist)
}
