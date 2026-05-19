import { useState, useEffect } from 'react'
import type { Card, Column } from '@group/shared'
import { useAuthFetch, safeJson } from './useAuth'

export function useColumns(boardId: string) {
  const [columns, setColumns] = useState<Column[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const authFetch = useAuthFetch()

  const refresh = async () => {
    if (!boardId) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await safeJson(await authFetch(`/api/boards/${boardId}/columns`))
      if (!data.success) throw new Error(data.message || 'Unable to load columns')
      setColumns(sortColumns((data.data ?? []).map(normalizeColumn)))
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Unable to load columns')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [authFetch, boardId])

  const createColumn = async (name: string) => {
    setError(null)

    const res = await authFetch(`/api/boards/${boardId}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await safeJson(res)

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Unable to create column')
    }

    const column = normalizeColumn({ ...data.data, cards: [] } as Column)
    setColumns((prev) => sortColumns([...prev, column]))
    return column
  }

function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

  const createCard = async (columnId: string, title: string) => {
    const tempId = `temp-${uuid()}`
    const now = new Date().toISOString()
    const tempCard: Card = {
      id: tempId,
      columnId,
      title,
      order: getNextCardOrder(columns, columnId),
      createdAt: now,
      updatedAt: now,
      comments: [],
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
    const data = await safeJson(res)

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

    const card = normalizeCard({ ...data.data, comments: [] } as Card)
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

  const updateCard = async (cardId: string, updates: { title?: string; description?: string }) => {
    const previousColumns = columns

    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        cards: (col.cards || []).map((card) =>
          card.id === cardId
            ? { ...card, ...updates, updatedAt: new Date().toISOString() }
            : card
        ),
      }))
    )

    const res = await authFetch(`/api/boards/cards/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const data = await safeJson(res)

    if (!res.ok || !data.success) {
      setColumns(previousColumns)
      throw new Error(data.message || 'Unable to update card')
    }

    const saved = normalizeCard({ ...data.data, comments: [] } as Card)
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        cards: sortCards(
          (col.cards || []).map((card) => (card.id === cardId ? { ...saved, comments: card.comments || [] } : card))
        ),
      }))
    )
    return saved
  }

  const addComment = async (cardId: string, content: string) => {
    const res = await authFetch(`/api/boards/cards/${cardId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    const data = await safeJson(res)

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Unable to add comment')
    }

    const comment = data.data
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        cards: (col.cards || []).map((card) =>
          card.id === cardId
            ? { ...card, comments: [...(card.comments || []), comment] }
            : card
        ),
      }))
    )
    return comment
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
    const data = await safeJson(res)

    if (!res.ok || !data.success) {
      setColumns(previousColumns)
      throw new Error(data.message || 'Unable to move card')
    }

    const savedCard = normalizeCard({ ...data.data, comments: movedCard.comments || [] } as Card)
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

  const reorderColumns = async (sourceIndex: number, destinationIndex: number) => {
    if (sourceIndex === destinationIndex) return
    setError(null)

    const previousColumns = columns
    const next = [...previousColumns]
    const [moved] = next.splice(sourceIndex, 1)
    next.splice(destinationIndex, 0, moved)
    const reindexed = next.map((col, index) => ({ ...col, order: index }))
    setColumns(reindexed)

    const updates = reindexed.map((col) => ({ id: col.id, order: col.order }))
    const res = await authFetch(`/api/boards/${boardId}/columns/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    })
    const data = await safeJson(res)

    if (!res.ok || !data.success) {
      setColumns(previousColumns)
      throw new Error(data.message || 'Unable to reorder columns')
    }
  }

  const deleteColumn = async (columnId: string) => {
    setError(null)
    const previousColumns = columns
    setColumns((prev) => prev.filter((col) => col.id !== columnId))

    const res = await authFetch(`/api/boards/columns/${columnId}`, { method: 'DELETE' })
    const data = await safeJson(res)

    if (!res.ok || !data.success) {
      setColumns(previousColumns)
      throw new Error(data.message || 'Unable to delete column')
    }
  }

  const deleteCard = async (cardId: string) => {
    setError(null)
    const previousColumns = columns.map((col) => ({ ...col, cards: [...(col.cards || [])] }))
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        cards: (col.cards || []).filter((card) => card.id !== cardId),
      }))
    )

    const res = await authFetch(`/api/boards/cards/${cardId}`, { method: 'DELETE' })
    const data = await safeJson(res)

    if (!res.ok || !data.success) {
      setColumns(previousColumns)
      throw new Error(data.message || 'Unable to delete card')
    }
  }

  return { columns, isLoading, error, createColumn, createCard, updateCard, addComment, moveCard, reorderColumns, deleteColumn, deleteCard }
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
  return { ...card, comments: card.comments || [] }
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
