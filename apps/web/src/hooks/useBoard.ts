import { useState, useEffect } from 'react'
import type { Board } from '@group/shared'

export function useBoard(boardId: string) {
  const [board, setBoard] = useState<Board | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    if (!boardId) return
    fetch(`/api/boards/${boardId}`)
      .then((r) => r.json())
      .then((data) => {
        setBoard(data.data || null)
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [boardId])

  return { board, isLoading }
}
