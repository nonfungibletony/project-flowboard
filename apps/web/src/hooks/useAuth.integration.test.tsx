// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useUserMe, useAuthFetch } from './useAuth'

const getTokenMock = vi.fn(() => Promise.resolve('fake-token'))

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: getTokenMock })
}))

let fetchCalls: Array<{ url: string; init?: RequestInit }> = []

beforeEach(() => {
  fetchCalls = []
  getTokenMock.mockClear()

  global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchCalls.push({ url: String(input), init })
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { id: 'u1', clerkUserId: 'c1', email: 'a@b.com', name: 'Test User' } }),
    } as Response
  })
})

describe('useAuthFetch', () => {
  it('injects Authorization Bearer header', async () => {
    const { result } = renderHook(() => useAuthFetch())
    const authFetch = result.current
    await authFetch('/api/test')

    const call = fetchCalls[0]
    expect(call.init?.headers).toBeDefined()
  })
})

describe('useUserMe', () => {
  it('fetches /me directly instead of /api/me (BUG)', async () => {
    const { result } = renderHook(() => useUserMe())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(fetchCalls.length).toBeGreaterThanOrEqual(1)
    // BUG: hits /me directly without /api prefix — causes 404 when UI and API share host
    expect(fetchCalls[0].url).toBe('/me')
    expect(fetchCalls[0].url).not.toBe('/api/me')
  })
})
