import { useState, useEffect } from 'react'
import type { Board } from '@group/shared'
import { useAuthFetch } from './useAuth'

export function useBoard(boardId: string) {
  const [board, setBoard] = useState<Board | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const authFetch = useAuthFetch()

  useEffect(() => {
    if (!boardId) return
    authFetch(`/api/boards/${boardId}`)
      .then((r) => r.json())
      .then((data) => {
        setBoard(data.data || null)
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [authFetch, boardId])

  return { board, isLoading }
}
