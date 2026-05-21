import { useState, useEffect, useCallback } from 'react'
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

  const updateBoard = useCallback(
    async (updates: { name?: string; description?: string; backgroundColour?: string | null }) => {
      const res = await authFetch(`/api/boards/${boardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await safeJson(res)
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Unable to update board')
      }
      setBoard(data.data || null)
      return data.data
    },
    [authFetch, boardId]
  )

  return { board, isLoading, updateBoard }
}
