import { useState, useEffect } from 'react'
import type { Board } from '@group/shared'
import { useAuthFetch } from './useAuth'

export function useBoards() {
  const [boards, setBoards] = useState<Board[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const authFetch = useAuthFetch()

  useEffect(() => {
    setIsLoading(true)
    setError(null)

    authFetch(`/api/boards`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) {
          throw new Error(data.message || 'Unable to load boards')
        }

        setBoards(data.data ?? [])
        setIsLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load boards')
        setIsLoading(false)
      })
  }, [authFetch])

  const createBoard = async (name: string, description?: string) => {
    setError(null)

    const res = await authFetch(`/api/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    })
    const data = await res.json()

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Unable to create board')
    }

    setBoards((prev) => [...prev, data.data])
    return data.data as Board
  }

  return { boards, isLoading, error, createBoard }
}
