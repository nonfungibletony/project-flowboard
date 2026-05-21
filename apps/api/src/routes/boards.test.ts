import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'node:path'

describe('Boards route bugs', () => {
  const src = fs.readFileSync(path.join(__dirname, 'boards.ts'), 'utf8')

  it('PATCH /:id does not verify createdBy ownership', () => {
    expect(src).toContain('router.patch("/:id"')
    expect(src).toContain('requireAuth')
    // Bug: after req.user.id is available, there's no check against board.createdBy
    expect(src).not.toMatch(/createdBy\s*!==?\s*req\.user\.id/)
    expect(src).not.toMatch(/createdBy\s*!==?\s*req\.user\?\.id/)
  })

  it('DELETE /:id does not verify createdBy ownership', () => {
    expect(src).toContain('router.delete("/:id"')
    expect(src).not.toMatch(/createdBy\s*!==?\s*req\.user\.id/)
  })
})
