import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'node:path'

describe('useBoards hook bug', () => {
  const src = fs.readFileSync(path.join(__dirname, 'useBoards.ts'), 'utf8')

  it('createBoard does not throw or return error on non-2xx response', () => {
    expect(src).not.toContain('if (!res.ok)')
    expect(src).not.toMatch(/throw\s+new\s+Error/)
    expect(src).not.toMatch(/return\s*\{[^}]*error/)
  })

  it('base URL path starts with /api', () => {
    expect(src).toContain('/api/boards')
  })
})
