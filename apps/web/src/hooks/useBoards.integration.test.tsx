// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useBoards } from './useBoards'

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: vi.fn(() => Promise.resolve('board-token')) })
}))

describe('useBoards', () => {
  it('createBoard silently swallows non-2xx responses without throwing or returning error (BUG)', async () => {
    global.fetch = vi.fn(async (_input, _init) => {
      return {
        ok: false,
        status: 500,
        json: async () => ({ success: false, message: 'Database Error' }),
      } as Response
    })

    const { result } = renderHook(() => useBoards())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // BUG: should reject/throw on 500, but it silently resolves
    await expect(result.current.createBoard('Fail Board')).resolves.toBeUndefined()
  })

  it('uses /api/boards endpoint', async () => {
    const fetchCalls: string[] = []
    global.fetch = vi.fn(async (input) => {
      fetchCalls.push(String(input))
      return { ok: true, status: 200, json: async () => ({ success: true, data: [] }) } as Response
    })

    const { result } = renderHook(() => useBoards())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(fetchCalls[0]).toContain('/api/boards')
  })
})
