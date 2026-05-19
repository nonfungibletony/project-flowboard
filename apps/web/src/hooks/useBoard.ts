import { useState, useEffect } from 'react'
import type { Board } from '@group/shared'
import { useAuthFetch, safeJson } from './useAuth'

export function useBoard(boardId: string) {
  const [board, setBoard] = useState<Board | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const authFetch = useAuthFetch()

  useEffect(() => {
    if (!boardId) return
    authFetch(`/api/boards/${boardId}`)
      .then((r) => safeJson(r))
      .then((data) => {
        setBoard(data.data || null)
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [authFetch, boardId])

  return { board, isLoading }
}
