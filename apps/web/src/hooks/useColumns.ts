import { useState, useEffect } from 'react'
import type { Card, Column } from '@group/shared'
import { useAuthFetch } from './useAuth'

export function useColumns(boardId: string) {
  const [columns, setColumns] = useState<Column[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const authFetch = useAuthFetch()

  useEffect(() => {
    if (!boardId) return

    setIsLoading(true)
    setError(null)

    authFetch(`/api/boards/${boardId}/columns`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) {
          throw new Error(data.message || 'Unable to load columns')
        }

        setColumns(sortColumns((data.data ?? []).map(normalizeColumn)))
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

  return { columns, isLoading, error, createColumn, createCard, moveCard, deleteCard }
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
