import { useState, useEffect, useCallback, useRef } from 'react'
import type { Workspace } from '@group/shared'
import { useAuthFetch, safeJson } from './useAuth'

interface UseWorkspacesResult {
  workspaces: Workspace[]
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
  createWorkspace: (name: string, slug?: string) => Promise<Workspace | null>
  updateWorkspace: (id: string, updates: { name?: string; slug?: string }) => Promise<void>
  deleteWorkspace: (id: string) => Promise<void>
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
}

export function useWorkspaces(): UseWorkspacesResult {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const initialLoadDone = useRef(false)

  const authFetch = useAuthFetch()

  const fetchWorkspaces = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await authFetch('/api/workspaces')
      const json = await safeJson(res)
      if (!res.ok) {
        throw new Error(json.message || `Failed to load workspaces (${res.status})`)
      }
      if (!json.success) {
        throw new Error(json.message || 'Failed to load workspaces')
      }
      setWorkspaces(json.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error loading workspaces'))
      setWorkspaces([])
    } finally {
      setIsLoading(false)
    }
  }, [authFetch])

  const refresh = useCallback(async () => {
    await fetchWorkspaces()
  }, [fetchWorkspaces])

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true
      fetchWorkspaces()
    }
  }, [fetchWorkspaces])

  const createWorkspace = useCallback(
    async (name: string, slug?: string): Promise<Workspace | null> => {
      if (!name.trim()) {
        setError(new Error('Workspace name is required'))
        return null
      }
      setIsCreating(true)
      setError(null)
      try {
        const res = await authFetch('/api/workspaces', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            slug: slug?.trim() || undefined,
          }),
        })
        const json = await safeJson(res)
        if (!res.ok) {
          throw new Error(json.message || `Failed to create workspace (${res.status})`)
        }
        if (!json.success) {
          throw new Error(json.message || 'Failed to create workspace')
        }
        setWorkspaces((prev) => [json.data, ...prev])
        return json.data
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Unknown error creating workspace'))
        return null
      } finally {
        setIsCreating(false)
      }
    },
    [authFetch]
  )

  const updateWorkspace = useCallback(
    async (id: string, updates: { name?: string; slug?: string }) => {
      setIsUpdating(true)
      setError(null)
      try {
        const res = await authFetch(`/api/workspaces/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
        const json = await safeJson(res)
        if (!res.ok) {
          throw new Error(json.message || `Failed to update workspace (${res.status})`)
        }
        if (!json.success) {
          throw new Error(json.message || 'Failed to update workspace')
        }
        setWorkspaces((prev) =>
          prev.map((w) => (w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w))
        )
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Unknown error updating workspace'))
        throw e
      } finally {
        setIsUpdating(false)
      }
    },
    [authFetch]
  )

  const deleteWorkspace = useCallback(
    async (id: string) => {
      setIsDeleting(true)
      setError(null)
      try {
        const res = await authFetch(`/api/workspaces/${id}`, {
          method: 'DELETE',
        })
        const json = await safeJson(res)
        if (!res.ok) {
          throw new Error(json.message || `Failed to delete workspace (${res.status})`)
        }
        if (!json.success) {
          throw new Error(json.message || 'Failed to delete workspace')
        }
        setWorkspaces((prev) => prev.filter((w) => w.id !== id))
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Unknown error deleting workspace'))
        throw e
      } finally {
        setIsDeleting(false)
      }
    },
    [authFetch]
  )

  return { workspaces, isLoading, error, refresh, createWorkspace, updateWorkspace, deleteWorkspace, isCreating, isUpdating, isDeleting }
}
