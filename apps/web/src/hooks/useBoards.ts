import { useState, useEffect } from 'react'
import type { Board } from '@group/shared'
import { useAuth } from '@clerk/clerk-react'

export function useBoards() {
  const [boards, setBoards] = useState<Board[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { getToken } = useAuth()

  useEffect(() => {
    fetch(`/api/boards`)
      .then((r) => r.json())
      .then((data) => {
        setBoards(data.data || [])
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [])

  const createBoard = async (name: string, description?: string) => {
    const token = await getToken()
    const res = await fetch(`/api/boards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ name, description }),
    })
    const data = await res.json()
    if (data.success) {
      setBoards((prev) => [...prev, data.data])
    }
  }

  return { boards, isLoading, createBoard }
}
