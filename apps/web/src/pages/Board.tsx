import { useEffect, useRef, useState } from 'react'
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import { useParams } from 'react-router-dom'
import type { Activity, Card, Column as ColumnType } from '@group/shared'
import { Column } from '../components/Column'
import { useBoard } from '../hooks/useBoard'
import { useColumns } from '../hooks/useColumns'
import { useAuthFetch } from '../hooks/useAuth'
import { BOARD_BACKGROUNDS } from '../constants/boardBackgrounds'
import { isTypingTarget } from '../utils/keyboard'

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
  const [showActivity, setShowActivity] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [activityError, setActivityError] = useState<string | null>(null)
  const [isLoadingActivities, setIsLoadingActivities] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsBackground, setSettingsBackground] = useState<string | null>(null)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [focusedColumnId, setFocusedColumnId] = useState<string | null>(null)
  const [focusedCard, setFocusedCard] = useState<Card | null>(null)
  const [shortcutCardColumnId, setShortcutCardColumnId] = useState<string | null>(null)
  const [shortcutCardTitle, setShortcutCardTitle] = useState('')
  const [shortcutCardError, setShortcutCardError] = useState<string | null>(null)
  const [isCreatingShortcutCard, setIsCreatingShortcutCard] = useState(false)
  const [editCard, setEditCard] = useState<Card | null>(null)
  const [editCardTitle, setEditCardTitle] = useState('')
  const [editCardDescription, setEditCardDescription] = useState('')
  const [editCardError, setEditCardError] = useState<string | null>(null)
  const [isSavingEditCard, setIsSavingEditCard] = useState(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const authFetch = useAuthFetch()
  const { board, members, isLoading: boardLoading, error: boardError, inviteMember, removeMember, updateBoard } = useBoard(boardId!)
  const { columns, labels, isLoading: columnsLoading, error, createColumn, createCard, moveCard, reorderColumns, deleteCard, createLabel, setCardLabels, setCardDueDate, updateCardDetails, getCardAttachments, uploadCardAttachment, deleteCardAttachment, getCardChecklists, createChecklist, deleteChecklist, createChecklistItem, updateChecklistItem, reorderChecklistItems, deleteChecklistItem } = useColumns(boardId!)

  const canEdit = board?.role === 'owner' || board?.role === 'editor'
  const isOwner = board?.role === 'owner'
  const hasFilters = Boolean(searchTerm || selectedLabelIds.length || dueFrom || dueTo)
  const filteredColumns = filterColumns(columns, searchTerm, selectedLabelIds, dueFrom, dueTo)
  const visibleCardCount = filteredColumns.reduce((count, column) => count + (column.cards?.length || 0), 0)

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearchTerm(searchInput.trim().toLowerCase()), 250)
    return () => window.clearTimeout(timeout)
  }, [searchInput])

  const loadActivities = async () => {
    if (!boardId) return

    setActivityError(null)
    setIsLoadingActivities(true)

    try {
      const res = await authFetch(`/api/boards/${boardId}/activities`)
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Unable to load activity')
      }
      setActivities(data.data ?? [])
    } catch (err) {
      setActivityError(err instanceof Error ? err.message : 'Unable to load activity')
    } finally {
      setIsLoadingActivities(false)
    }
  }

  useEffect(() => {
    loadActivities()
  }, [authFetch, boardId])

  useEffect(() => {
    setSettingsBackground(board?.backgroundColour || null)
  }, [board?.backgroundColour])

  useEffect(() => {
    if (!focusedColumnId && filteredColumns[0]) setFocusedColumnId(filteredColumns[0].id)
  }, [focusedColumnId, filteredColumns])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowShortcuts(false)
        setShortcutCardColumnId(null)
        setEditCard(null)
        setShowActivity(false)
        setShowSettings(false)
        setShowAddColumn(false)
        return
      }

      if (isTypingTarget(event.target)) return

      if (event.key === '?') {
        event.preventDefault()
        setShowShortcuts(true)
        return
      }

      if (event.key === '/' || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
        event.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      if (!canEdit) return

      if (event.key.toLowerCase() === 'c') {
        event.preventDefault()
        setShowAddColumn(true)
        return
      }

      if (event.key.toLowerCase() === 'n') {
        event.preventDefault()
        const columnId = focusedColumnId || filteredColumns[0]?.id
        if (columnId) {
          setShortcutCardColumnId(columnId)
          setShortcutCardTitle('')
          setShortcutCardError(null)
        }
        return
      }

      if (event.key.toLowerCase() === 'e') {
        event.preventDefault()
        const card = focusedCard || findFirstCard(filteredColumns)
        if (card) openEditCard(card)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canEdit, filteredColumns, focusedCard, focusedColumnId])

  const handleCreateColumn = async () => {
    if (!newColumnName.trim()) return

    setColumnError(null)
    setIsCreatingColumn(true)

    try {
      await createColumn(newColumnName.trim())
      loadActivities()
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
      loadActivities()
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

  const handleSaveSettings = async () => {
    setSettingsError(null)
    setIsSavingSettings(true)

    try {
      await updateBoard({ backgroundColour: settingsBackground })
      setShowSettings(false)
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Unable to update board')
    } finally {
      setIsSavingSettings(false)
    }
  }

  const handleCreateShortcutCard = async () => {
    if (!shortcutCardColumnId || !shortcutCardTitle.trim()) return

    setShortcutCardError(null)
    setIsCreatingShortcutCard(true)

    try {
      const card = await createCard(shortcutCardColumnId, shortcutCardTitle.trim())
      setFocusedCard(card)
      loadActivities()
      setShortcutCardColumnId(null)
      setShortcutCardTitle('')
    } catch (err) {
      setShortcutCardError(err instanceof Error ? err.message : 'Unable to create card')
    } finally {
      setIsCreatingShortcutCard(false)
    }
  }

  const openEditCard = (card: Card) => {
    setEditCard(card)
    setEditCardTitle(card.title)
    setEditCardDescription(card.description || '')
    setEditCardError(null)
  }

  const handleSaveEditCard = async () => {
    if (!editCard || !editCardTitle.trim()) return

    setEditCardError(null)
    setIsSavingEditCard(true)

    try {
      const updated = await updateCardDetails(editCard.id, editCard.columnId, {
        title: editCardTitle.trim(),
        description: editCardDescription.trim(),
      })
      setFocusedCard(updated)
      loadActivities()
      setEditCard(null)
    } catch (err) {
      setEditCardError(err instanceof Error ? err.message : 'Unable to update card')
    } finally {
      setIsSavingEditCard(false)
    }
  }

  if (boardLoading || columnsLoading) return <p>Loading...</p>

  return (
    <div className="board-shell" style={{ background: board?.backgroundColour || undefined }}>
      <div className="container">
      <div className="board-header">
        <div>
          <h1>{board?.name || 'Board'}</h1>
          {board?.description && <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>{board.description}</p>}
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => setShowActivity(true)}>
          Activity
        </button>
        {canEdit && (
          <button type="button" className="btn btn-secondary" onClick={() => setShowSettings(true)}>
            Settings
          </button>
        )}
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

      {(boardError || error || moveError || inviteError || activityError) && <p className="page-error">{inviteError || moveError || error || boardError || activityError}</p>}

      <div className="board-filters">
        <div className="filter-row">
          <input
            ref={searchInputRef}
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
                        isFocused={focusedColumnId === column.id}
                        focusedCardId={focusedCard?.id || null}
                        searchTerm={searchTerm}
                        columnDragHandleProps={dragProvided.dragHandleProps}
                        onFocusColumn={() => setFocusedColumnId(column.id)}
                        onFocusCard={(card) => {
                          setFocusedColumnId(column.id)
                          setFocusedCard(card)
                        }}
                        onAddCard={async (title) => {
                          const card = await createCard(column.id, title)
                          loadActivities()
                          return card
                        }}
                        onDeleteCard={(cardId) => deleteCard(cardId, column.id)}
                        onCreateLabel={createLabel}
                        onSetCardLabels={(cardId, labelIds) => setCardLabels(cardId, column.id, labelIds)}
                        onSetCardDueDate={async (cardId, dueDate) => {
                          const updated = await setCardDueDate(cardId, column.id, dueDate)
                          loadActivities()
                          return updated
                        }}
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
      {showActivity && (
        <div className="modal-overlay" onClick={() => setShowActivity(false)}>
          <div className="modal activity-modal" onClick={(e) => e.stopPropagation()}>
            <div className="activity-header">
              <h2>Activity</h2>
              <button type="button" className="btn btn-secondary btn-small" onClick={loadActivities} disabled={isLoadingActivities}>
                Refresh
              </button>
            </div>
            {isLoadingActivities ? (
              <p className="modal-copy">Loading activity...</p>
            ) : activities.length ? (
              <div className="activity-list">
                {activities.map((activity) => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-dot" />
                    <div>
                      <p>{formatActivity(activity)}</p>
                      <span>{new Date(activity.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="modal-copy">No activity yet.</p>
            )}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowActivity(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {showSettings && (
        <div className="modal-overlay" onClick={isSavingSettings ? undefined : () => setShowSettings(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Board settings</h2>
            <div className="background-picker">
              <button
                type="button"
                className={`background-swatch background-swatch-blank${settingsBackground === null ? ' background-swatch-selected' : ''}`}
                onClick={() => setSettingsBackground(null)}
                disabled={isSavingSettings}
                aria-label="Use default background"
              />
              {BOARD_BACKGROUNDS.map((background) => (
                <button
                  key={background.name}
                  type="button"
                  className={`background-swatch${settingsBackground === background.value ? ' background-swatch-selected' : ''}`}
                  style={{ background: background.value }}
                  onClick={() => setSettingsBackground(background.value)}
                  disabled={isSavingSettings}
                  aria-label={`Use ${background.name} background`}
                  title={background.name}
                />
              ))}
            </div>
            {settingsError && <p className="form-error">{settingsError}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowSettings(false)} disabled={isSavingSettings}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveSettings} disabled={isSavingSettings}>
                {isSavingSettings ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      {shortcutCardColumnId && (
        <div className="modal-overlay" onClick={isCreatingShortcutCard ? undefined : () => setShortcutCardColumnId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>New card</h2>
            <input
              type="text"
              placeholder="Card title"
              value={shortcutCardTitle}
              onChange={(e) => setShortcutCardTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateShortcutCard()
              }}
              maxLength={500}
              disabled={isCreatingShortcutCard}
              autoFocus
            />
            {shortcutCardError && <p className="form-error">{shortcutCardError}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShortcutCardColumnId(null)} disabled={isCreatingShortcutCard}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleCreateShortcutCard} disabled={isCreatingShortcutCard || !shortcutCardTitle.trim()}>
                {isCreatingShortcutCard ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
      {editCard && (
        <div className="modal-overlay" onClick={isSavingEditCard ? undefined : () => setEditCard(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit card</h2>
            <input
              type="text"
              placeholder="Card title"
              value={editCardTitle}
              onChange={(e) => setEditCardTitle(e.target.value)}
              maxLength={500}
              disabled={isSavingEditCard}
              autoFocus
            />
            <textarea
              placeholder="Description"
              value={editCardDescription}
              onChange={(e) => setEditCardDescription(e.target.value)}
              maxLength={5000}
              disabled={isSavingEditCard}
            />
            {editCardError && <p className="form-error">{editCardError}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setEditCard(null)} disabled={isSavingEditCard}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveEditCard} disabled={isSavingEditCard || !editCardTitle.trim()}>
                {isSavingEditCard ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showShortcuts && (
        <ShortcutHelp onClose={() => setShowShortcuts(false)} />
      )}
      </div>
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

function findFirstCard(columns: ColumnType[]) {
  for (const column of columns) {
    const card = column.cards?.[0] as Card | undefined
    if (card) return card
  }
  return null
}

function formatActivity(activity: Activity) {
  const actor = activity.userName || 'Someone'
  const metadata = activity.metadata || {}
  const cardTitle = typeof metadata.cardTitle === 'string' ? metadata.cardTitle : 'a card'
  const columnName = typeof metadata.columnName === 'string' ? metadata.columnName : 'a column'
  const fromColumnName = typeof metadata.fromColumnName === 'string' ? metadata.fromColumnName : 'another column'
  const toColumnName = typeof metadata.toColumnName === 'string' ? metadata.toColumnName : 'another column'

  switch (activity.actionType) {
    case 'created_column':
      return `${actor} added column ${columnName}`
    case 'created_card':
      return `${actor} created ${cardTitle} in ${columnName}`
    case 'moved_card':
      return `${actor} moved ${cardTitle} from ${fromColumnName} to ${toColumnName}`
    case 'updated_card':
      return `${actor} updated ${cardTitle}`
    case 'added_comment':
      return `${actor} commented on ${cardTitle}`
    default:
      return `${actor} performed ${activity.actionType}`
  }
}

function ShortcutHelp({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    ['N', 'New card in focused column'],
    ['C', 'New column'],
    ['E', 'Edit focused card'],
    ['/', 'Focus search'],
    ['Cmd+K', 'Focus search'],
    ['?', 'Show shortcuts'],
    ['Esc', 'Close modal or cancel edit'],
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
