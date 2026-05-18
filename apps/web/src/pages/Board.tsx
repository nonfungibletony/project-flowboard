import { useState } from 'react'
import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
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
  const [moveError, setMoveError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [isInviting, setIsInviting] = useState(false)
  const { board, members, isLoading: boardLoading, error: boardError, inviteMember, removeMember } = useBoard(boardId!)
  const { columns, labels, isLoading: columnsLoading, error, createColumn, createCard, moveCard, deleteCard, createLabel, setCardLabels, setCardDueDate, getCardAttachments, uploadCardAttachment, deleteCardAttachment } = useColumns(boardId!)

  const canEdit = board?.role === 'owner' || board?.role === 'editor'
  const isOwner = board?.role === 'owner'

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
    const { destination, draggableId, source } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    setMoveError(null)

    try {
      await moveCard(draggableId, source.droppableId, destination.droppableId, destination.index)
    } catch (err) {
      setMoveError(err instanceof Error ? err.message : 'Unable to move card')
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

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="columns">
          {columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              labels={labels}
              canEdit={canEdit}
              onAddCard={(title) => createCard(column.id, title)}
              onDeleteCard={(cardId) => deleteCard(cardId, column.id)}
              onCreateLabel={createLabel}
              onSetCardLabels={(cardId, labelIds) => setCardLabels(cardId, column.id, labelIds)}
              onSetCardDueDate={(cardId, dueDate) => setCardDueDate(cardId, column.id, dueDate)}
              onGetCardAttachments={(cardId) => getCardAttachments(cardId, column.id)}
              onUploadCardAttachment={(cardId, file) => uploadCardAttachment(cardId, column.id, file)}
              onDeleteCardAttachment={(cardId, attachmentId) => deleteCardAttachment(cardId, column.id, attachmentId)}
            />
          ))}
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
