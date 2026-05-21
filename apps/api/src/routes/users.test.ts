import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'node:path'

describe('Users route bug', () => {
  const src = fs.readFileSync(path.join(__dirname, 'users.ts'), 'utf8')

  it('POST /users is missing requireAuth in source', () => {
    expect(src).toContain('router.post("/",')
    // requireAuth is NOT present before the async handler in router.post("/", ...)
    expect(src).not.toMatch(/router\.post\s*\(\s*"\/"\s*,\s*requireAuth/)
  })
})
