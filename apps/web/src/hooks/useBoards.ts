import { useState, useEffect } from 'react'
import type { Board } from '@group/shared'
import { useAuthFetch } from './useAuth'

export function useBoards() {
  const [boards, setBoards] = useState<Board[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const authFetch = useAuthFetch()

  useEffect(() => {
    authFetch(`/api/boards`)
      .then((r) => r.json())
      .then((data) => {
        setBoards(data.data || [])
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [authFetch])

  const createBoard = async (name: string, description?: string) => {
    const res = await authFetch(`/api/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    })
    const data = await res.json()
    if (data.success) {
      setBoards((prev) => [...prev, data.data])
    }
  }

  return { boards, isLoading, createBoard }
}
