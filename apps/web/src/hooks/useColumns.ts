import { useState, useEffect } from 'react'
import type { Column } from '@group/shared'
import { useAuth } from '@clerk/clerk-react'

export function useColumns(boardId: string) {
  const [columns, setColumns] = useState<Column[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { getToken } = useAuth()

  useEffect(() => {
    if (!boardId) return
    fetch(`/api/boards/${boardId}/columns`)
      .then((r) => r.json())
      .then((data) => {
        setColumns(data.data || [])
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [boardId])

  const createColumn = async (name: string) => {
    const token = await getToken()
    const res = await fetch(`/api/boards/${boardId}/columns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    if (data.success) {
      setColumns((prev) => [...prev, { ...data.data, cards: [] }])
    }
  }

  const createCard = async (columnId: string, title: string) => {
    const token = await getToken()
    const res = await fetch(`/api/boards/columns/${columnId}/cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
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

  return { columns, isLoading, createColumn, createCard }
}
