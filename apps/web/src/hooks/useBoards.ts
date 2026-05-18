import { useState, useEffect, useCallback, useRef } from 'react'
import type { Board } from '@group/shared'
import { useAuthFetch } from './useAuth'

interface UseBoardsResult {
  boards: Board[]
  isLoading: boolean
  error: Error | null
  createBoard: (name: string, description?: string) => Promise<Board | null>
  isCreating: boolean
}

export function useBoards(): UseBoardsResult {
  const [boards, setBoards] = useState<Board[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const initialLoadDone = useRef(false)

  const authFetch = useAuthFetch()

  // Fetch boards list
  const fetchBoards = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await authFetch('/api/boards')
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.message || `Failed to load boards (${res.status})`)
      }
      if (!json.success) {
        throw new Error(json.message || 'Failed to load boards')
      }
      setBoards(json.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error loading boards'))
      setBoards([])
    } finally {
      setIsLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true
      fetchBoards()
    }
  }, [fetchBoards])

  // Create a new board
  const createBoard = useCallback(
    async (name: string, description?: string): Promise<Board | null> => {
      if (!name.trim()) {
        setError(new Error('Board name is required'))
        return null
      }
      setIsCreating(true)
      setError(null)
      try {
        const res = await authFetch('/api/boards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), description: description?.trim() || undefined }),
        })
        const json = await res.json()
        if (!res.ok) {
          throw new Error(json.message || `Failed to create board (${res.status})`)
        }
        if (!json.success) {
          throw new Error(json.message || 'Failed to create board')
        }
        // Optimistically prepend the new board
        setBoards((prev) => [json.data, ...prev])
        return json.data
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Unknown error creating board'))
        return null
      } finally {
        setIsCreating(false)
      }
    },
    [authFetch]
  )

  return { boards, isLoading, error, createBoard, isCreating }
}
