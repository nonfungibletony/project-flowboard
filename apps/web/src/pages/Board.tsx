import { useState, useCallback } from 'react'
import { DragDropContext, Droppable, type DropResult } from '@hello-pangea/dnd'
import { useParams } from 'react-router-dom'
import { Column } from '../components/Column'
import { CardDetailModal } from '../components/CardDetailModal'
import { useBoard } from '../hooks/useBoard'
import { useColumns } from '../hooks/useColumns'
import { useCardDetail } from '../hooks/useCardDetail'
import { useActivities } from '../hooks/useActivities'
import { formatActivity } from '../utils/activityFormat'
import { BOARD_BACKGROUNDS } from '../constants/boardBackgrounds'
import type { Card } from '@group/shared'

export function Board() {
  const { boardId } = useParams()
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [columnError, setColumnError] = useState<string | null>(null)
  const [isCreatingColumn, setIsCreatingColumn] = useState(false)
  const [moveError, setMoveError] = useState<string | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsBackground, setSettingsBackground] = useState<string | null>(null)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [showActivity, setShowActivity] = useState(false)

  const { board, isLoading: boardLoading, updateBoard } = useBoard(boardId!)
  const { columns, isLoading: columnsLoading, error, createColumn, createCard, updateCard: updateCardInColumns, addComment: addCommentInColumns, moveCard, reorderColumns, deleteColumn, deleteCard, loadChecklists, createChecklist, deleteChecklist, createChecklistItem, updateChecklistItem, deleteChecklistItem } = useColumns(boardId!)
  const { card, comments, isLoading: detailLoading, error: detailError, updateCard, addComment } = useCardDetail(selectedCardId)
  const { activities, isLoading: activityLoading, error: activityError } = useActivities(boardId!)

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
    const { destination, draggableId, source, type } = result
    console.log('[D&D] drag end:', { draggableId, source: source.droppableId, sourceIndex: source.index, destination: destination?.droppableId, destIndex: destination?.index, type })
    if (!destination) { console.log('[D&D] no destination, skipping'); return }
    if (destination.droppableId === source.droppableId && destination.index === source.index) { console.log('[D&D] dropped in same place, skipping'); return }

    setMoveError(null)

    if (type === 'COLUMN') {
      try {
        await reorderColumns(source.index, destination.index)
      } catch (err) {
        console.error('[D&D] reorderColumns error:', err)
        setMoveError(err instanceof Error ? err.message : 'Unable to reorder columns')
      }
      return
    }

    try {
      await moveCard(draggableId, source.droppableId, destination.droppableId, destination.index)
    } catch (err) {
      console.error('[D&D] moveCard error:', err)
      setMoveError(err instanceof Error ? err.message : 'Unable to move card')
    }
  }, [moveCard, reorderColumns])

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

  if (boardLoading || columnsLoading) return <p>Loading...</p>

  return (
    <div className="board-shell" style={{ background: board?.backgroundColour || undefined }}>
      <div className="container">
        <div className="board-header">
          <div>
            <h1>{board?.name || 'Board'}</h1>
            {board?.description && <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>{board.description}</p>}
          </div>
          <div className="board-header-actions">
            <button className="btn btn-secondary" onClick={() => setShowActivity(true)}>
              Activity
            </button>
            <button className="btn btn-secondary" onClick={() => { setSettingsBackground(board?.backgroundColour || null); setShowSettings(true) }}>
              Settings
            </button>
          </div>
        </div>

        {(error || moveError) && <p className="page-error">{moveError || error}</p>}

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="board" direction="horizontal" type="COLUMN">
            {(boardProvided) => (
              <div className="columns" ref={boardProvided.innerRef} {...boardProvided.droppableProps}>
                {columns.map((column, index) => (
                  <Column
                    key={column.id}
                    column={column}
                    index={index}
                    onAddCard={(title) => createCard(column.id, title)}
                    onCardClick={handleCardClick}
                    onDeleteColumn={deleteColumn}
                  />
                ))}
                {boardProvided.placeholder}
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
            )}
          </Droppable>
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
            onDeleteCard={deleteCard}
            onLoadChecklists={loadChecklists}
            onCreateChecklist={createChecklist}
            onDeleteChecklist={deleteChecklist}
            onCreateChecklistItem={createChecklistItem}
            onUpdateChecklistItem={updateChecklistItem}
            onDeleteChecklistItem={deleteChecklistItem}
          />
        )}

        {showActivity && (
          <div className="modal-overlay" onClick={() => setShowActivity(false)}>
            <div className="modal activity-modal" onClick={(e) => e.stopPropagation()}>
              <h2>Activity</h2>
              {activityLoading && <p className="page-loading">Loading activity...</p>}
              {activityError && <p className="form-error">{activityError}</p>}
              {!activityLoading && !activityError && (
                <ul className="activity-list">
                  {activities.length === 0 && <li className="activity-empty">No activity yet.</li>}
                  {activities.map((a) => (
                    <li key={a.id} className="activity-item">
                      <span className="activity-text">{formatActivity(a)}</span>
                      <time className="activity-time" dateTime={a.createdAt}>
                        {new Date(a.createdAt).toLocaleString()}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowActivity(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showSettings && (
          <div className="modal-overlay" onClick={isSavingSettings ? undefined : () => setShowSettings(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Board Settings</h2>
              <div className="form-group">
                <label>Background Colour</label>
                <div className="background-picker">
                  <button
                    type="button"
                    className={`background-swatch${settingsBackground === null ? ' background-swatch-selected' : ''}`}
                    onClick={() => setSettingsBackground(null)}
                    disabled={isSavingSettings}
                    aria-label="Use default background"
                  >
                    <span className="swatch-blank">Default</span>
                  </button>
                  {BOARD_BACKGROUNDS.map((bg) => (
                    <button
                      key={bg.name}
                      type="button"
                      className={`background-swatch${settingsBackground === bg.value ? ' background-swatch-selected' : ''}`}
                      style={{ background: bg.value }}
                      onClick={() => setSettingsBackground(bg.value)}
                      disabled={isSavingSettings}
                      aria-label={`Use ${bg.name} background`}
                      title={bg.name}
                    />
                  ))}
                </div>
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
      </div>
    </div>
  )
}
