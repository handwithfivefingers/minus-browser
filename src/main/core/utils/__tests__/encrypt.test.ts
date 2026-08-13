// @vitest-environment node
import { describe, it, expect } from 'vitest'

import { encrypt, decrypt } from '~/main/core/utils/encrypt'

describe('encrypt / decrypt', () => {
  it('encrypt and decrypt functions exist', () => {
    expect(encrypt).toBeDefined()
    expect(decrypt).toBeDefined()
  })

  it('round-trips plaintext', () => {
    const result = encrypt('test')
    expect(decrypt(result)).toBe('test')
  })

  it('encrypt returns different output than input', () => {
    const result = encrypt('test')
    expect(result).not.toBe('test')
  })

  it('produces unique ciphertext per call (random IV)', () => {
    expect(encrypt('test')).not.toBe(encrypt('test'))
  })
})
