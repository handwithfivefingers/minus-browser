import { describe, it, expect } from 'vitest'

import { isSameURl } from '~/shared/utils/isSameUrl'

describe('isSameURl', () => {
  it('returns true for identical URLs', () => {
    expect(isSameURl('https://example.com/page', 'https://example.com/page')).toBe(true)
  })

  it('returns true for same URL with and without trailing slash', () => {
    expect(isSameURl('https://example.com', 'https://example.com/')).toBe(true)
  })

  it('returns false for different paths', () => {
    expect(isSameURl('https://example.com/page1', 'https://example.com/page2')).toBe(false)
  })

  it('returns false for different origins', () => {
    expect(isSameURl('https://example.com', 'https://other.com')).toBe(false)
  })

  it('returns true regardless of protocol case', () => {
    expect(isSameURl('https://example.com', 'https://example.com')).toBe(true)
  })

  it('returns true for same URL with hash', () => {
    expect(isSameURl('https://example.com/page#section', 'https://example.com/page#section')).toBe(true)
  })

  it('returns false for same origin, different hash', () => {
    expect(isSameURl('https://example.com/page#a', 'https://example.com/page#b')).toBe(false)
  })

  it('returns false for invalid URLs', () => {
    expect(isSameURl('not-a-url', 'https://example.com')).toBe(false)
  })

  it('returns false when both URLs are invalid', () => {
    expect(isSameURl('bad', 'bad')).toBe(false)
  })

  it('matches subdomains correctly', () => {
    expect(isSameURl('https://sub.example.com', 'https://example.com')).toBe(false)
  })
})
