import { useState, useEffect } from 'react'
import type { Attachment, Card, Checklist, ChecklistItem, Column, Label } from '@group/shared'
import { useAuthFetch } from './useAuth'

export function useColumns(boardId: string) {
  const [columns, setColumns] = useState<Column[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const authFetch = useAuthFetch()

  useEffect(() => {
    if (!boardId) return

    setIsLoading(true)
    setError(null)

    Promise.all([
      authFetch(`/api/boards/${boardId}/columns`).then((r) => r.json()),
      authFetch(`/api/boards/${boardId}/labels`).then((r) => r.json()),
    ])
      .then(([columnsData, labelsData]) => {
        if (!columnsData.success) {
          throw new Error(columnsData.message || 'Unable to load columns')
        }
        if (!labelsData.success) {
          throw new Error(labelsData.message || 'Unable to load labels')
        }

        setColumns(sortColumns((columnsData.data ?? []).map(normalizeColumn)))
        setLabels(labelsData.data ?? [])
        setIsLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load columns')
        setIsLoading(false)
      })
  }, [authFetch, boardId])

  const createColumn = async (name: string) => {
    setError(null)

    const res = await authFetch(`/api/boards/${boardId}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, order: getNextColumnOrder(columns) }),
    })
    const data = await res.json()

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Unable to create column')
    }

    const column = normalizeColumn({ ...data.data, cards: [] } as Column)
    setColumns((prev) => sortColumns([...prev, column]))
    return column
  }

  const createCard = async (columnId: string, title: string) => {
    const tempId = `temp-${crypto.randomUUID()}`
    const now = new Date().toISOString()
    const tempCard: Card = {
      id: tempId,
      columnId,
      title,
      order: getNextCardOrder(columns, columnId),
      createdAt: now,
      updatedAt: now,
      dueDate: null,
      comments: [],
      labels: [],
      attachments: [],
      checklists: [],
    }

    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId
          ? { ...col, cards: sortCards([...(col.cards || []), tempCard]) }
          : col
      )
    )

    const res = await authFetch(`/api/boards/columns/${columnId}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    const data = await res.json()

    if (!res.ok || !data.success) {
      setColumns((prev) =>
        prev.map((col) =>
          col.id === columnId
            ? { ...col, cards: (col.cards || []).filter((card) => card.id !== tempId) }
            : col
        )
      )
      throw new Error(data.message || 'Unable to create card')
    }

    const card = normalizeCard({ ...data.data, comments: [], labels: [], attachments: [], checklists: [] } as Card)
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId
          ? {
              ...col,
              cards: sortCards((col.cards || []).map((existing) => existing.id === tempId ? card : existing)),
            }
          : col
      )
    )
    return card
  }

  const moveCard = async (cardId: string, sourceColumnId: string, targetColumnId: string, targetIndex: number) => {
    setError(null)

    const previousColumns = columns
    const nextColumns = moveCardInColumns(previousColumns, cardId, sourceColumnId, targetColumnId, targetIndex)
    if (nextColumns === previousColumns) return

    const movedCard = nextColumns
      .find((column) => column.id === targetColumnId)
      ?.cards?.find((card) => card.id === cardId)

    if (!movedCard) return

    setColumns(nextColumns)

    const res = await authFetch(`/api/boards/cards/${cardId}/move`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        columnId: targetColumnId,
        order: movedCard.order,
        updates: getCardOrderUpdates(nextColumns, sourceColumnId, targetColumnId),
      }),
    })
    const data = await res.json()

    if (!res.ok || !data.success) {
      setColumns(previousColumns)
      throw new Error(data.message || 'Unable to move card')
    }

    const savedCard = normalizeCard({ ...data.data, comments: movedCard.comments || [], labels: movedCard.labels || [], attachments: movedCard.attachments || [], checklists: movedCard.checklists || [] } as Card)
    setColumns((prev) =>
      prev.map((column) =>
        column.id === targetColumnId
          ? {
              ...column,
              cards: sortCards((column.cards || []).map((card) => card.id === cardId ? savedCard : card)),
            }
          : column
      )
    )
  }

  const reorderColumns = async (sourceIndex: number, targetIndex: number) => {
    setError(null)

    const previousColumns = columns
    const nextColumns = moveColumn(columns, sourceIndex, targetIndex)
    if (nextColumns === columns) return

    setColumns(nextColumns)

    const res = await authFetch(`/api/boards/${boardId}/columns/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: nextColumns.map((column) => ({ id: column.id, order: column.order })),
      }),
    })
    const data = await res.json()

    if (!res.ok || !data.success) {
      setColumns(previousColumns)
      throw new Error(data.message || 'Unable to reorder columns')
    }

    const savedColumns = data.data as Column[]
    setColumns((prev) => {
      const byId = new Map(savedColumns.map((column) => [column.id, column]))
      return sortColumns(prev.map((column) => ({ ...column, order: byId.get(column.id)?.order ?? column.order })))
    })
  }

  const deleteCard = async (cardId: string, columnId: string) => {
    setError(null)

    const previousColumns = columns
    setColumns((prev) =>
      prev.map((column) =>
        column.id === columnId
          ? { ...column, cards: reindexCards((column.cards || []).filter((card) => card.id !== cardId)) }
          : column
      )
    )

    const res = await authFetch(`/api/boards/cards/${cardId}`, {
      method: 'DELETE',
    })
    const data = await res.json()

    if (!res.ok || !data.success) {
      setColumns(previousColumns)
      throw new Error(data.message || 'Unable to delete card')
    }
  }

  const createLabel = async (name: string, colour: string) => {
    setError(null)

    const res = await authFetch(`/api/boards/${boardId}/labels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, colour }),
    })
    const data = await res.json()

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Unable to create label')
    }

    const label = data.data as Label
    setLabels((prev) => [...prev, label])
    return label
  }

  const setCardLabels = async (cardId: string, columnId: string, labelIds: string[]) => {
    setError(null)

    const previousColumns = columns
    const nextLabels = labels.filter((label) => labelIds.includes(label.id))

    setColumns((prev) =>
      prev.map((column) =>
        column.id === columnId
          ? {
              ...column,
              cards: (column.cards || []).map((card) => card.id === cardId ? { ...card, labels: nextLabels } : card),
            }
          : column
      )
    )

    const res = await authFetch(`/api/boards/cards/${cardId}/labels`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ labelIds }),
    })
    const data = await res.json()

    if (!res.ok || !data.success) {
      setColumns(previousColumns)
      throw new Error(data.message || 'Unable to update labels')
    }

    const savedLabels = data.data as Label[]
    setColumns((prev) =>
      prev.map((column) =>
        column.id === columnId
          ? {
              ...column,
              cards: (column.cards || []).map((card) => card.id === cardId ? { ...card, labels: savedLabels } : card),
            }
          : column
      )
    )
  }

  const setCardDueDate = async (cardId: string, columnId: string, dueDate: string | null) => {
    setError(null)

    const previousColumns = columns
    setColumns((prev) =>
      prev.map((column) =>
        column.id === columnId
          ? {
              ...column,
              cards: (column.cards || []).map((card) => card.id === cardId ? { ...card, dueDate } : card),
            }
          : column
      )
    )

    const res = await authFetch(`/api/boards/cards/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dueDate }),
    })
    const data = await res.json()

    if (!res.ok || !data.success) {
      setColumns(previousColumns)
      throw new Error(data.message || 'Unable to update due date')
    }

    const savedCard = normalizeCard(data.data as Card)
    setColumns((prev) =>
      prev.map((column) =>
        column.id === columnId
          ? {
              ...column,
              cards: (column.cards || []).map((card) => card.id === cardId ? { ...savedCard, labels: card.labels || [], comments: card.comments || [], attachments: card.attachments || [], checklists: card.checklists || [] } : card),
            }
          : column
      )
    )
  }

  const getCardAttachments = async (cardId: string, columnId: string) => {
    setError(null)

    const res = await authFetch(`/api/boards/cards/${cardId}/attachments`)
    const data = await res.json()

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Unable to load attachments')
    }

    const attachments = data.data as Attachment[]
    setColumns(updateCard(columnId, cardId, (card) => ({ ...card, attachments })))
    return attachments
  }

  const uploadCardAttachment = async (cardId: string, columnId: string, file: File) => {
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    const res = await authFetch(`/api/boards/cards/${cardId}/attachments`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Unable to upload attachment')
    }

    const attachment = data.data as Attachment
    setColumns(updateCard(columnId, cardId, (card) => ({ ...card, attachments: [...(card.attachments || []), attachment] })))
    return attachment
  }

  const deleteCardAttachment = async (cardId: string, columnId: string, attachmentId: string) => {
    setError(null)

    const res = await authFetch(`/api/boards/attachments/${attachmentId}`, {
      method: 'DELETE',
    })
    const data = await res.json()

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Unable to delete attachment')
    }

    setColumns(updateCard(columnId, cardId, (card) => ({
      ...card,
      attachments: (card.attachments || []).filter((attachment) => attachment.id !== attachmentId),
    })))
  }

  const getCardChecklists = async (cardId: string, columnId: string) => {
    setError(null)

    const res = await authFetch(`/api/boards/cards/${cardId}/checklists`)
    const data = await res.json()

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Unable to load checklists')
    }

    const checklists = data.data as Checklist[]
    setColumns(updateCard(columnId, cardId, (card) => ({ ...card, checklists })))
    return checklists
  }

  const createChecklist = async (cardId: string, columnId: string, title: string) => {
    setError(null)

    const res = await authFetch(`/api/boards/cards/${cardId}/checklists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    const data = await res.json()

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Unable to create checklist')
    }

    const checklist = data.data as Checklist
    setColumns(updateCard(columnId, cardId, (card) => ({ ...card, checklists: [...(card.checklists || []), checklist] })))
    return checklist
  }

  const deleteChecklist = async (cardId: string, columnId: string, checklistId: string) => {
    setError(null)

    const res = await authFetch(`/api/boards/checklists/${checklistId}`, { method: 'DELETE' })
    const data = await res.json()

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Unable to delete checklist')
    }

    setColumns(updateCard(columnId, cardId, (card) => ({
      ...card,
      checklists: (card.checklists || []).filter((checklist) => checklist.id !== checklistId),
    })))
  }

  const createChecklistItem = async (cardId: string, columnId: string, checklistId: string, content: string) => {
    setError(null)

    const res = await authFetch(`/api/boards/checklists/${checklistId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    const data = await res.json()

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Unable to create checklist item')
    }

    const item = data.data as ChecklistItem
    setColumns(updateChecklist(cardId, columnId, checklistId, (checklist) => ({ ...checklist, items: [...(checklist.items || []), item] })))
    return item
  }

  const updateChecklistItem = async (cardId: string, columnId: string, checklistId: string, itemId: string, updates: Partial<Pick<ChecklistItem, 'content' | 'completed' | 'order'>>) => {
    setError(null)

    const res = await authFetch(`/api/boards/checklist-items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const data = await res.json()

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Unable to update checklist item')
    }

    const item = data.data as ChecklistItem
    setColumns(updateChecklist(cardId, columnId, checklistId, (checklist) => ({
      ...checklist,
      items: sortChecklistItems((checklist.items || []).map((current) => current.id === itemId ? item : current)),
    })))
    return item
  }

  const reorderChecklistItems = async (cardId: string, columnId: string, checklistId: string, sourceIndex: number, targetIndex: number) => {
    setError(null)

    const card = columns.find((column) => column.id === columnId)?.cards?.find((current) => current.id === cardId)
    const checklist = (card?.checklists as Checklist[] | undefined)?.find((current) => current.id === checklistId)
    if (!checklist) return []

    const items = moveChecklistItem(checklist.items || [], sourceIndex, targetIndex)
    setColumns(updateChecklist(cardId, columnId, checklistId, (current) => ({ ...current, items })))

    const res = await authFetch(`/api/boards/checklists/${checklistId}/items/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: items.map((item) => ({ id: item.id, order: item.order })) }),
    })
    const data = await res.json()

    if (!res.ok || !data.success) {
      setColumns(updateChecklist(cardId, columnId, checklistId, (current) => ({ ...current, items: checklist.items || [] })))
      throw new Error(data.message || 'Unable to reorder checklist items')
    }

    const savedItems = data.data as ChecklistItem[]
    setColumns(updateChecklist(cardId, columnId, checklistId, (current) => ({ ...current, items: sortChecklistItems(savedItems) })))
    return savedItems
  }

  const deleteChecklistItem = async (cardId: string, columnId: string, checklistId: string, itemId: string) => {
    setError(null)

    const res = await authFetch(`/api/boards/checklist-items/${itemId}`, { method: 'DELETE' })
    const data = await res.json()

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Unable to delete checklist item')
    }

    setColumns(updateChecklist(cardId, columnId, checklistId, (checklist) => ({
      ...checklist,
      items: (checklist.items || []).filter((item) => item.id !== itemId),
    })))
  }

  return { columns, labels, isLoading, error, createColumn, createCard, moveCard, reorderColumns, deleteCard, createLabel, setCardLabels, setCardDueDate, getCardAttachments, uploadCardAttachment, deleteCardAttachment, getCardChecklists, createChecklist, deleteChecklist, createChecklistItem, updateChecklistItem, reorderChecklistItems, deleteChecklistItem }
}

function sortColumns(columns: Column[]) {
  return [...columns].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
}

function getNextColumnOrder(columns: Column[]) {
  return columns.reduce((maxOrder, column) => Math.max(maxOrder, column.order), -1) + 1
}

function normalizeColumn(column: Column) {
  return { ...column, cards: sortCards(column.cards || []) }
}

function normalizeCard(card: Card) {
  return { ...card, comments: card.comments || [], labels: card.labels || [], attachments: card.attachments || [], checklists: card.checklists || [] }
}

function updateCard(columnId: string, cardId: string, updater: (card: Card) => Card) {
  return (columns: Column[]) =>
    columns.map((column) =>
      column.id === columnId
        ? { ...column, cards: (column.cards || []).map((card) => card.id === cardId ? updater(card) : card) }
        : column
    )
}

function updateChecklist(cardId: string, columnId: string, checklistId: string, updater: (checklist: Checklist) => Checklist) {
  return updateCard(columnId, cardId, (card) => ({
    ...card,
    checklists: (card.checklists || []).map((checklist) => checklist.id === checklistId ? updater(checklist as Checklist) : checklist),
  }))
}

function sortChecklistItems(items: ChecklistItem[]) {
  return [...items].sort((a, b) => a.order - b.order)
}

function moveChecklistItem(items: ChecklistItem[], sourceIndex: number, targetIndex: number) {
  if (sourceIndex === targetIndex) return items

  const nextItems = [...items]
  const [movedItem] = nextItems.splice(sourceIndex, 1)
  if (!movedItem) return items

  nextItems.splice(targetIndex, 0, movedItem)
  return nextItems.map((item, index) => ({ ...item, order: index }))
}

function sortCards(cards: Card[]) {
  return [...cards].map(normalizeCard).sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
}

function getNextCardOrder(columns: Column[], columnId: string) {
  const cards = columns.find((column) => column.id === columnId)?.cards || []
  return cards.reduce((maxOrder, card) => Math.max(maxOrder, card.order), -1) + 1
}

function moveCardInColumns(columns: Column[], cardId: string, sourceColumnId: string, targetColumnId: string, targetIndex: number) {
  let movedCard: Card | undefined
  const nextColumns = columns.map((column) => {
    if (column.id !== sourceColumnId) return column

    const cards = (column.cards || []).filter((card) => {
      if (card.id === cardId) {
        movedCard = card
        return false
      }
      return true
    })

    return { ...column, cards: reindexCards(cards) }
  })

  if (!movedCard) return columns

  return nextColumns.map((column) => {
    if (column.id !== targetColumnId) return column

    const cards = [...(column.cards || [])]
    cards.splice(targetIndex, 0, { ...movedCard, columnId: targetColumnId })
    return { ...column, cards: reindexCards(cards) }
  })
}

function reindexCards(cards: Card[]) {
  return cards.map((card, index) => ({ ...card, order: index }))
}

function moveColumn(columns: Column[], sourceIndex: number, targetIndex: number) {
  if (sourceIndex === targetIndex) return columns

  const nextColumns = [...columns]
  const [movedColumn] = nextColumns.splice(sourceIndex, 1)
  if (!movedColumn) return columns

  nextColumns.splice(targetIndex, 0, movedColumn)
  return nextColumns.map((column, index) => ({ ...column, order: index }))
}

function getCardOrderUpdates(columns: Column[], sourceColumnId: string, targetColumnId: string) {
  return columns
    .filter((column) => column.id === sourceColumnId || column.id === targetColumnId)
    .flatMap((column) =>
      (column.cards || [])
        .filter((card) => !card.id.startsWith('temp-'))
        .map((card) => ({ id: card.id, columnId: column.id, order: card.order }))
    )
}
