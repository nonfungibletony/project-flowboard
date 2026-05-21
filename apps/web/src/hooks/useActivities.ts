import { useState, useEffect } from 'react'
import type { Activity } from '@group/shared'
import { useAuthFetch, safeJson } from './useAuth'

export function useActivities(boardId: string) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const authFetch = useAuthFetch()

  const refresh = async () => {
    if (!boardId) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await authFetch(`/api/boards/${boardId}/activities`)
      const data = await safeJson(res)
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Unable to load activity')
      }
      setActivities(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load activity')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authFetch, boardId])

  return { activities, isLoading, error, refresh }
}
