import { useState, useEffect } from 'react'
import type { Attachment, Card, Column, Label } from '@group/shared'
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
      body: JSON.stringify({ name }),
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

    const card = normalizeCard({ ...data.data, comments: [], labels: [], attachments: [] } as Card)
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

    const savedCard = normalizeCard({ ...data.data, comments: movedCard.comments || [], labels: movedCard.labels || [], attachments: movedCard.attachments || [] } as Card)
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
              cards: (column.cards || []).map((card) => card.id === cardId ? { ...savedCard, labels: card.labels || [], comments: card.comments || [], attachments: card.attachments || [] } : card),
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

  return { columns, labels, isLoading, error, createColumn, createCard, moveCard, deleteCard, createLabel, setCardLabels, setCardDueDate, getCardAttachments, uploadCardAttachment, deleteCardAttachment }
}

function sortColumns(columns: Column[]) {
  return [...columns].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
}

function normalizeColumn(column: Column) {
  return { ...column, cards: sortCards(column.cards || []) }
}

function normalizeCard(card: Card) {
  return { ...card, comments: card.comments || [], labels: card.labels || [], attachments: card.attachments || [] }
}

function updateCard(columnId: string, cardId: string, updater: (card: Card) => Card) {
  return (columns: Column[]) =>
    columns.map((column) =>
      column.id === columnId
        ? { ...column, cards: (column.cards || []).map((card) => card.id === cardId ? updater(card) : card) }
        : column
    )
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

function getCardOrderUpdates(columns: Column[], sourceColumnId: string, targetColumnId: string) {
  return columns
    .filter((column) => column.id === sourceColumnId || column.id === targetColumnId)
    .flatMap((column) =>
      (column.cards || [])
        .filter((card) => !card.id.startsWith('temp-'))
        .map((card) => ({ id: card.id, columnId: column.id, order: card.order }))
    )
}
