import { useAuth } from '@clerk/clerk-react'
import { useEffect, useState } from 'react'

export function useAuthFetch() {
  const { getToken } = useAuth()

  const authFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const token = await getToken()
    const headers = new Headers(init?.headers)
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    return fetch(input, { ...init, headers })
  }

  return authFetch
}

export function useUserMe() {
  const authFetch = useAuthFetch()
  const [user, setUser] = useState<{ id: string; clerkUserId: string; email: string; name: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    authFetch('/api/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setUser(data.data)
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [authFetch])

  return { user, isLoading }
}
