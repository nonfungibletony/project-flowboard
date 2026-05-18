import { useState, useEffect, useCallback } from 'react'
import type { Card, Comment } from '@group/shared'
import { useAuthFetch } from './useAuth'

export function useCardDetail(cardId: string | null) {
  const [card, setCard] = useState<Card | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const authFetch = useAuthFetch()

  const loadCard = useCallback(async () => {
    if (!cardId) {
      setCard(null)
      setComments([])
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [cardRes, commentsRes] = await Promise.all([
        authFetch(`/api/boards/cards/${cardId}`),
        authFetch(`/api/boards/cards/${cardId}/comments`),
      ])

      const cardData = await cardRes.json()
      const commentsData = await commentsRes.json()

      if (!cardRes.ok || !cardData.success) {
        throw new Error(cardData.message || 'Unable to load card')
      }

      setCard(cardData.data)
      setComments(commentsData.success ? commentsData.data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load card')
    } finally {
      setIsLoading(false)
    }
  }, [authFetch, cardId])

  useEffect(() => {
    loadCard()
  }, [loadCard])

  const updateCard = useCallback(
    async (updates: { title?: string; description?: string }) => {
      if (!cardId) return

      setError(null)
      const res = await authFetch(`/api/boards/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Unable to update card')
      }

      setCard((prev) => (prev ? { ...prev, ...data.data, comments: prev.comments || [] } : null))
      return data.data
    },
    [authFetch, cardId]
  )

  const addComment = useCallback(
    async (content: string) => {
      if (!cardId) return

      setError(null)
      const res = await authFetch(`/api/boards/cards/${cardId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Unable to add comment')
      }

      const comment: Comment = data.data
      setComments((prev) => [...prev, comment])
      setCard((prev) => (prev ? { ...prev, comments: [...(prev.comments || []), comment] } : null))
      return comment
    },
    [authFetch, cardId]
  )

  return { card, comments, isLoading, error, updateCard, addComment, refresh: loadCard }
}
