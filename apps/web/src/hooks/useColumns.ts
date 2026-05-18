import { useState, useEffect } from 'react'
import type { Column } from '@group/shared'
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

        setColumns(sortColumns(data.data ?? []))
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

    const column = { ...data.data, cards: [] } as Column
    setColumns((prev) => sortColumns([...prev, column]))
    return column
  }

  const createCard = async (columnId: string, title: string) => {
    const res = await authFetch(`/api/boards/columns/${columnId}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    const data = await res.json()
    if (data.success) {
      setColumns((prev) =>
        prev.map((col) =>
          col.id === columnId
            ? { ...col, cards: [...(col.cards || []), data.data] }
            : col
        )
      )
    }
  }

  return { columns, isLoading, error, createColumn, createCard }
}

function sortColumns(columns: Column[]) {
  return [...columns].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
}
