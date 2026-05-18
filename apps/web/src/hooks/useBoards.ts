import { useState, useEffect } from 'react'
import type { Board, BoardTemplate } from '@group/shared'
import { useAuthFetch } from './useAuth'

export function useBoards() {
  const [boards, setBoards] = useState<Board[]>([])
  const [templates, setTemplates] = useState<BoardTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const authFetch = useAuthFetch()

  useEffect(() => {
    setIsLoading(true)
    setError(null)

    Promise.all([
      authFetch(`/api/boards`).then((r) => r.json()),
      authFetch(`/api/boards/templates`).then((r) => r.json()),
    ])
      .then(([boardsData, templatesData]) => {
        if (!boardsData.success) {
          throw new Error(boardsData.message || 'Unable to load boards')
        }
        if (!templatesData.success) {
          throw new Error(templatesData.message || 'Unable to load templates')
        }

        setBoards(sortBoards(boardsData.data ?? []))
        setTemplates(templatesData.data ?? [])
        setIsLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load boards')
        setIsLoading(false)
      })
  }, [authFetch])

  const createBoard = async (name: string, description?: string, templateId?: string) => {
    setError(null)

    const res = await authFetch(`/api/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, templateId: templateId || undefined }),
    })
    const data = await res.json()

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Unable to create board')
    }

    setBoards((prev) => sortBoards([...prev, data.data]))
    return data.data as Board
  }

  const toggleStarred = async (boardId: string, starred: boolean) => {
    setError(null)

    const previousBoards = boards
    setBoards((prev) => sortBoards(prev.map((board) => board.id === boardId ? { ...board, starred } : board)))

    const res = await authFetch(`/api/boards/${boardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starred }),
    })
    const data = await res.json()

    if (!res.ok || !data.success) {
      setBoards(previousBoards)
      throw new Error(data.message || 'Unable to update board')
    }

    setBoards((prev) => sortBoards(prev.map((board) => board.id === boardId ? data.data : board)))
  }

  const deleteBoard = async (boardId: string) => {
    setError(null)

    const previousBoards = boards
    setBoards((prev) => prev.filter((board) => board.id !== boardId))

    const res = await authFetch(`/api/boards/${boardId}`, {
      method: 'DELETE',
    })
    const data = await res.json()

    if (!res.ok || !data.success) {
      setBoards(previousBoards)
      throw new Error(data.message || 'Unable to delete board')
    }
  }

  return { boards, templates, isLoading, error, createBoard, deleteBoard, toggleStarred }
}

function sortBoards(boards: Board[]) {
  return [...boards].sort((a, b) => {
    if (a.starred !== b.starred) return a.starred ? -1 : 1
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}
