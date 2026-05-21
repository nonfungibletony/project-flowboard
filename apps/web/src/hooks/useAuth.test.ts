import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'node:path'

describe('useAuth hook bugs', () => {
  const src = fs.readFileSync(path.join(__dirname, 'useAuth.ts'), 'utf8')

  it('useUserMe hits /me directly instead of /api/me (404 in dev)', () => {
    expect(src).toContain("authFetch('/me')")
    expect(src).not.toContain("authFetch('/api/me')")
  })

  it('useUserMe effect has empty dependency array risking stale closure', () => {
    expect(src).toContain('useEffect(() => {')
    expect(src).toContain('}, [])')
    expect(src).not.toContain('}, [authFetch])')
  })
})
