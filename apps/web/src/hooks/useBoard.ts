import { useState, useEffect } from 'react'
import type { Board } from '@group/shared'
import { useAuthFetch } from './useAuth'

type BoardRole = 'owner' | 'editor' | 'viewer'

export interface BoardMember {
  boardId: string
  userId: string
  role: BoardRole
  email: string
  name: string
  createdAt: string
}

type BoardWithRole = Board & { role?: BoardRole }

export function useBoard(boardId: string) {
  const [board, setBoard] = useState<BoardWithRole | null>(null)
  const [members, setMembers] = useState<BoardMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const authFetch = useAuthFetch()

  useEffect(() => {
    if (!boardId) return
    setIsLoading(true)
    setError(null)

    Promise.all([
      authFetch(`/api/boards/${boardId}`).then((r) => r.json()),
      authFetch(`/api/boards/${boardId}/members`).then((r) => r.json()),
    ])
      .then(([boardData, membersData]) => {
        if (!boardData.success) throw new Error(boardData.message || 'Unable to load board')
        if (!membersData.success) throw new Error(membersData.message || 'Unable to load members')

        setBoard(boardData.data || null)
        setMembers(membersData.data || [])
        setIsLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load board')
        setIsLoading(false)
      })
  }, [authFetch, boardId])

  const inviteMember = async (email: string, role: Exclude<BoardRole, 'owner'>) => {
    setError(null)
    const res = await authFetch(`/api/boards/${boardId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    })
    const data = await res.json()

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Unable to invite member')
    }

    setMembers((prev) => {
      const next = prev.filter((member) => member.userId !== data.data.userId)
      return [...next, data.data]
    })
    return data.data as BoardMember
  }

  const removeMember = async (userId: string) => {
    setError(null)
    const previousMembers = members
    setMembers((prev) => prev.filter((member) => member.userId !== userId))

    const res = await authFetch(`/api/boards/${boardId}/members/${userId}`, {
      method: 'DELETE',
    })
    const data = await res.json()

    if (!res.ok || !data.success) {
      setMembers(previousMembers)
      throw new Error(data.message || 'Unable to remove member')
    }
  }

  return { board, members, isLoading, error, inviteMember, removeMember }
}
