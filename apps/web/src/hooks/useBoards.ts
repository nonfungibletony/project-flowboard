import { useState, useEffect, useCallback, useRef } from 'react'
import type { Board } from '@group/shared'
import { useAuthFetch, safeJson } from './useAuth'

interface UseBoardsResult {
  boards: Board[]
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
  createBoard: (name: string, description?: string) => Promise<Board | null>
  updateBoard: (id: string, updates: { name?: string; description?: string; archived?: number }) => Promise<void>
  deleteBoard: (id: string) => Promise<void>
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
}

export function useBoards(): UseBoardsResult {
  const [boards, setBoards] = useState<Board[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const initialLoadDone = useRef(false)

  const authFetch = useAuthFetch()

  // Fetch boards list
  const fetchBoards = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await authFetch('/api/boards?includeArchived=1')
      const json = await safeJson(res)
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

  const refresh = useCallback(async () => {
    await fetchBoards()
  }, [fetchBoards])

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
        const json = await safeJson(res)
        if (!res.ok) {
          throw new Error(json.message || `Failed to create board (${res.status})`)
        }
        if (!json.success) {
          throw new Error(json.message || 'Failed to create board')
        }
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

  // Update (rename / archive) a board
  const updateBoard = useCallback(
    async (id: string, updates: { name?: string; description?: string; archived?: number }) => {
      setIsUpdating(true)
      setError(null)
      try {
        const res = await authFetch(`/api/boards/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
        const json = await safeJson(res)
        if (!res.ok) {
          throw new Error(json.message || `Failed to update board (${res.status})`)
        }
        if (!json.success) {
          throw new Error(json.message || 'Failed to update board')
        }
        setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b)))
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Unknown error updating board'))
        throw e
      } finally {
        setIsUpdating(false)
      }
    },
    [authFetch]
  )

  // Delete a board
  const deleteBoard = useCallback(
    async (id: string) => {
      setIsDeleting(true)
      setError(null)
      try {
        const res = await authFetch(`/api/boards/${id}`, {
          method: 'DELETE',
        })
        const json = await safeJson(res)
        if (!res.ok) {
          throw new Error(json.message || `Failed to delete board (${res.status})`)
        }
        if (!json.success) {
          throw new Error(json.message || 'Failed to delete board')
        }
        setBoards((prev) => prev.filter((b) => b.id !== id))
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Unknown error deleting board'))
        throw e
      } finally {
        setIsDeleting(false)
      }
    },
    [authFetch]
  )

  return { boards, isLoading, error, refresh, createBoard, updateBoard, deleteBoard, isCreating, isUpdating, isDeleting }
}
