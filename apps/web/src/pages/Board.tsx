import { useEffect, useState } from 'react'
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import { useParams } from 'react-router-dom'
import type { Card, Column as ColumnType } from '@group/shared'
import { Column } from '../components/Column'
import { useBoard } from '../hooks/useBoard'
import { useColumns } from '../hooks/useColumns'

export function Board() {
  const { boardId } = useParams()
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [columnError, setColumnError] = useState<string | null>(null)
  const [isCreatingColumn, setIsCreatingColumn] = useState(false)
  const [moveError, setMoveError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [isInviting, setIsInviting] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([])
  const [dueFrom, setDueFrom] = useState('')
  const [dueTo, setDueTo] = useState('')
  const { board, members, isLoading: boardLoading, error: boardError, inviteMember, removeMember } = useBoard(boardId!)
  const { columns, labels, isLoading: columnsLoading, error, createColumn, createCard, moveCard, reorderColumns, deleteCard, createLabel, setCardLabels, setCardDueDate, getCardAttachments, uploadCardAttachment, deleteCardAttachment, getCardChecklists, createChecklist, deleteChecklist, createChecklistItem, updateChecklistItem, reorderChecklistItems, deleteChecklistItem } = useColumns(boardId!)

  const canEdit = board?.role === 'owner' || board?.role === 'editor'
  const isOwner = board?.role === 'owner'
  const hasFilters = Boolean(searchTerm || selectedLabelIds.length || dueFrom || dueTo)
  const filteredColumns = filterColumns(columns, searchTerm, selectedLabelIds, dueFrom, dueTo)
  const visibleCardCount = filteredColumns.reduce((count, column) => count + (column.cards?.length || 0), 0)

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearchTerm(searchInput.trim().toLowerCase()), 250)
    return () => window.clearTimeout(timeout)
  }, [searchInput])

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

  const handleDragEnd = async (result: DropResult) => {
    if (!canEdit) return
    const { destination, draggableId, source, type } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    setMoveError(null)

    try {
      if (type === 'COLUMN') {
        if (hasFilters) return
        await reorderColumns(source.index, destination.index)
        return
      }

      await moveCard(draggableId, source.droppableId, destination.droppableId, destination.index)
    } catch (err) {
      setMoveError(err instanceof Error ? err.message : 'Unable to move item')
    }
  }

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return

    setInviteError(null)
    setIsInviting(true)

    try {
      await inviteMember(inviteEmail.trim(), inviteRole)
      setInviteEmail('')
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Unable to invite member')
    } finally {
      setIsInviting(false)
    }
  }

  const toggleLabelFilter = (labelId: string) => {
    setSelectedLabelIds((current) =>
      current.includes(labelId)
        ? current.filter((id) => id !== labelId)
        : [...current, labelId]
    )
  }

  const clearFilters = () => {
    setSearchInput('')
    setSearchTerm('')
    setSelectedLabelIds([])
    setDueFrom('')
    setDueTo('')
  }

  if (boardLoading || columnsLoading) return <p>Loading...</p>

  return (
    <div className="container">
      <div className="board-header">
        <div>
          <h1>{board?.name || 'Board'}</h1>
          {board?.description && <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>{board.description}</p>}
        </div>
        <div className="member-strip">
          {members.map((member) => (
            <div key={member.userId} className="member-pill" title={`${member.name} (${member.role})`}>
              <span className="member-avatar">{getInitials(member.name || member.email)}</span>
              <span>{member.name}</span>
              <span className="member-role">{member.role}</span>
              {isOwner && member.role !== 'owner' && (
                <button type="button" className="member-remove" onClick={() => removeMember(member.userId)}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {isOwner && (
        <div className="invite-panel">
          <input
            type="email"
            placeholder="Invite by email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            disabled={isInviting}
          />
          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')} disabled={isInviting}>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button className="btn btn-primary" onClick={handleInviteMember} disabled={isInviting || !inviteEmail.trim()}>
            {isInviting ? 'Inviting...' : 'Invite'}
          </button>
        </div>
      )}

      {(boardError || error || moveError || inviteError) && <p className="page-error">{inviteError || moveError || error || boardError}</p>}

      <div className="board-filters">
        <div className="filter-row">
          <input
            type="search"
            placeholder="Search cards"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <div className="date-filter">
            <input type="date" value={dueFrom} onChange={(e) => setDueFrom(e.target.value)} aria-label="Due from" />
            <span>to</span>
            <input type="date" value={dueTo} onChange={(e) => setDueTo(e.target.value)} aria-label="Due to" />
          </div>
          <button type="button" className="btn btn-secondary" onClick={clearFilters} disabled={!hasFilters}>
            Clear filters
          </button>
        </div>
        {!!labels.length && (
          <div className="label-filter">
            {labels.map((label) => {
              const selected = selectedLabelIds.includes(label.id)
              return (
                <button
                  key={label.id}
                  type="button"
                  className={`label-filter-chip${selected ? ' label-filter-chip-selected' : ''}`}
                  onClick={() => toggleLabelFilter(label.id)}
                >
                  <span className="label-colour" style={{ backgroundColor: label.colour }} />
                  <span>{label.name}</span>
                </button>
              )
            })}
          </div>
        )}
        {hasFilters && (
          <p className="filter-summary">
            Showing {visibleCardCount} matching card{visibleCardCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="board-columns" direction="horizontal" type="COLUMN">
          {(provided) => (
            <div className="columns" ref={provided.innerRef} {...provided.droppableProps}>
              {filteredColumns.map((column, index) => (
                <Draggable key={column.id} draggableId={`column-${column.id}`} index={index} isDragDisabled={!canEdit || hasFilters}>
                  {(dragProvided, dragSnapshot) => (
                    <div
                      className={dragSnapshot.isDragging ? 'column-wrapper column-wrapper-dragging' : 'column-wrapper'}
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                    >
                      <Column
                        column={column}
                        labels={labels}
                        canEdit={canEdit}
                        canDrag={canEdit && !hasFilters}
                        searchTerm={searchTerm}
                        columnDragHandleProps={dragProvided.dragHandleProps}
                        onAddCard={(title) => createCard(column.id, title)}
                        onDeleteCard={(cardId) => deleteCard(cardId, column.id)}
                        onCreateLabel={createLabel}
                        onSetCardLabels={(cardId, labelIds) => setCardLabels(cardId, column.id, labelIds)}
                        onSetCardDueDate={(cardId, dueDate) => setCardDueDate(cardId, column.id, dueDate)}
                        onGetCardAttachments={(cardId) => getCardAttachments(cardId, column.id)}
                        onUploadCardAttachment={(cardId, file) => uploadCardAttachment(cardId, column.id, file)}
                        onDeleteCardAttachment={(cardId, attachmentId) => deleteCardAttachment(cardId, column.id, attachmentId)}
                        onGetCardChecklists={(cardId) => getCardChecklists(cardId, column.id)}
                        onCreateChecklist={(cardId, title) => createChecklist(cardId, column.id, title)}
                        onDeleteChecklist={(cardId, checklistId) => deleteChecklist(cardId, column.id, checklistId)}
                        onCreateChecklistItem={(cardId, checklistId, content) => createChecklistItem(cardId, column.id, checklistId, content)}
                        onUpdateChecklistItem={(cardId, checklistId, itemId, updates) => updateChecklistItem(cardId, column.id, checklistId, itemId, updates)}
                        onReorderChecklistItems={(cardId, checklistId, sourceIndex, targetIndex) => reorderChecklistItems(cardId, column.id, checklistId, sourceIndex, targetIndex)}
                        onDeleteChecklistItem={(cardId, checklistId, itemId) => deleteChecklistItem(cardId, column.id, checklistId, itemId)}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {canEdit && showAddColumn ? (
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
              ) : canEdit ? (
                <button className="add-column-btn" onClick={() => setShowAddColumn(true)}>
                  + Add column
                </button>
              ) : null}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  )
}

function getInitials(value: string) {
  return value
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function filterColumns(columns: ColumnType[], searchTerm: string, selectedLabelIds: string[], dueFrom: string, dueTo: string) {
  if (!searchTerm && !selectedLabelIds.length && !dueFrom && !dueTo) return columns

  return columns.map((column) => ({
    ...column,
    cards: (column.cards || []).filter((card) => cardMatchesFilters(card, searchTerm, selectedLabelIds, dueFrom, dueTo)),
  }))
}

function cardMatchesFilters(card: Card, searchTerm: string, selectedLabelIds: string[], dueFrom: string, dueTo: string) {
  if (searchTerm) {
    const searchable = [
      card.title,
      card.description || '',
      ...(card.labels || []).map((label) => label.name),
    ].join(' ').toLowerCase()

    if (!searchable.includes(searchTerm)) return false
  }

  if (selectedLabelIds.length) {
    const cardLabelIds = new Set((card.labels || []).map((label) => label.id))
    if (!selectedLabelIds.every((labelId) => cardLabelIds.has(labelId))) return false
  }

  if (dueFrom || dueTo) {
    if (!card.dueDate) return false
    const dueDate = card.dueDate.slice(0, 10)
    if (dueFrom && dueDate < dueFrom) return false
    if (dueTo && dueDate > dueTo) return false
  }

  return true
}
