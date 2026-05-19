import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthFetch, safeJson } from './useAuth'

export interface MemberItem {
  id: string
  userId: string
  name: string
  email: string
  role: string
  createdAt: string
}

interface UseMembersResult {
  members: MemberItem[]
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
  addMember: (email: string) => Promise<boolean>
  removeMember: (memberId: string) => Promise<void>
  isAdding: boolean
  isRemoving: boolean
}

export function useMembers(workspaceId?: string): UseMembersResult {
  const [members, setMembers] = useState<MemberItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const initialLoadDone = useRef(false)

  const authFetch = useAuthFetch()

  const fetchMembers = useCallback(async () => {
    if (!workspaceId) {
      setIsLoading(false)
      setMembers([])
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const res = await authFetch(`/api/workspaces/${workspaceId}/members`)
      const json = await safeJson(res)
      if (!res.ok) {
        throw new Error(json.message || `Failed to load members (${res.status})`)
      }
      if (!json.success) {
        throw new Error(json.message || 'Failed to load members')
      }
      setMembers(json.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error loading members'))
      setMembers([])
    } finally {
      setIsLoading(false)
    }
  }, [authFetch, workspaceId])

  const refresh = useCallback(async () => {
    await fetchMembers()
  }, [fetchMembers])

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true
      fetchMembers()
    }
  }, [fetchMembers])

  const addMember = useCallback(
    async (email: string): Promise<boolean> => {
      if (!workspaceId || !email.trim()) return false
      setIsAdding(true)
      setError(null)
      try {
        const res = await authFetch(`/api/workspaces/${workspaceId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        })
        const json = await safeJson(res)
        if (!res.ok) {
          throw new Error(json.message || `Failed to add member (${res.status})`)
        }
        if (!json.success) {
          throw new Error(json.message || 'Failed to add member')
        }
        setMembers((prev) => {
          const exists = prev.some((m) => m.userId === json.data.userId)
          if (exists) return prev.map((m) => (m.userId === json.data.userId ? json.data : m))
          return [...prev, json.data]
        })
        return true
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Unknown error adding member'))
        return false
      } finally {
        setIsAdding(false)
      }
    },
    [authFetch, workspaceId]
  )

  const removeMember = useCallback(
    async (memberId: string) => {
      if (!workspaceId) return
      setIsRemoving(true)
      setError(null)
      try {
        const res = await authFetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
          method: 'DELETE',
        })
        const json = await safeJson(res)
        if (!res.ok) {
          throw new Error(json.message || `Failed to remove member (${res.status})`)
        }
        if (!json.success) {
          throw new Error(json.message || 'Failed to remove member')
        }
        setMembers((prev) => prev.filter((m) => m.id !== memberId))
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Unknown error removing member'))
        throw e
      } finally {
        setIsRemoving(false)
      }
    },
    [authFetch, workspaceId]
  )

  return { members, isLoading, error, refresh, addMember, removeMember, isAdding, isRemoving }
}
