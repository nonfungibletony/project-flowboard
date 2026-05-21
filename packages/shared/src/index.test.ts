import { describe, it, expect } from 'vitest'
import { CreateUserSchema, UpdateUserSchema, UpdateBoardSchema } from './index'

describe('Shared Zod schemas', () => {
  it('should reject empty UpdateUserSchema (bug: partial() strips constraints)', () => {
    // This SHOULD fail but currently passes because partial() removes .min(1) etc.
    expect(() => UpdateUserSchema.parse({})).toThrow()
  })

  it('should reject empty UpdateBoardSchema', () => {
    expect(() => UpdateBoardSchema.parse({})).toThrow()
  })
})
