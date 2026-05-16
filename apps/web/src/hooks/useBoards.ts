import { useState, useEffect } from 'react'
import type { Board } from '@group/shared'

const API_URL = '' // Uses Vite proxy

export function useBoards() {
  const [boards, setBoards] = useState<Board[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/boards`)
      .then((r) => r.json())
      .then((data) => {
        setBoards(data.data || [])
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [])

  const createBoard = async (name: string, description?: string) => {
    const res = await fetch(`${API_URL}/boards`, {
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
