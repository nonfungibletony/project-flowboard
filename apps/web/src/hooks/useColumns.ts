import { useState, useEffect } from 'react'
import type { Column, Card } from '@group/shared'

export function useColumns(boardId: string) {
  const [columns, setColumns] = useState<Column[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!boardId) return
    fetch(`/boards/${boardId}/columns`)
      .then((r) => r.json())
      .then((data) => {
        setColumns(data.data || [])
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [boardId])

  const createColumn = async (name: string) => {
    const res = await fetch(`/boards/${boardId}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    if (data.success) {
      setColumns((prev) => [...prev, { ...data.data, cards: [] }])
    }
  }

  const createCard = async (columnId: string, title: string) => {
    const res = await fetch(`/columns/${columnId}/cards`, {
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

  const moveCard = async (cardId: string, targetColumnId: string) => {
    const res = await fetch(`/cards/${cardId}/move`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columnId: targetColumnId }),
    })
    const data = await res.json()
    if (data.success) {
      setColumns((prev) => {
        let movedCard: Card | undefined
        const newCols = prev.map((col) => {
          const filtered = (col.cards || []).filter((c) => {
            if (c.id === cardId) {
              movedCard = c
              return false
            }
            return true
          })
          return { ...col, cards: filtered }
        })
        if (movedCard) {
          return newCols.map((col) =>
            col.id === targetColumnId
              ? { ...col, cards: [...(col.cards || []), movedCard!] }
              : col
          )
        }
        return prev
      })
    }
  }

  return { columns, isLoading, createColumn, createCard, moveCard }
}
