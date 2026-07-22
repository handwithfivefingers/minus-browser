import { describe, it, expect } from 'vitest'

import { isUrlMatchedByPatterns } from '~/shared/utils/parser'

describe('isUrlMatchedByPatterns', () => {
  it('matches *://*.example.com/* to https://www.example.com/page', () => {
    expect(isUrlMatchedByPatterns('https://www.example.com/page', ['*://*.example.com/*'])).toBe(true)
  })

  it('matches *://*.example.com/* to http://sub.example.com/path', () => {
    expect(isUrlMatchedByPatterns('http://sub.example.com/path', ['*://*.example.com/*'])).toBe(true)
  })

  it('rejects *://*.example.com/* for other domains', () => {
    expect(isUrlMatchedByPatterns('https://other.com/page', ['*://*.example.com/*'])).toBe(false)
  })

  it('matches exact URL pattern', () => {
    expect(isUrlMatchedByPatterns('https://example.com/page', ['https://example.com/page'])).toBe(true)
  })

  it('matches * wildcard to any URL', () => {
    expect(isUrlMatchedByPatterns('https://anything.com/path', ['*'])).toBe(true)
    expect(isUrlMatchedByPatterns('http://local.dev/test', ['*'])).toBe(true)
  })

  it('rejects non-matching URL', () => {
    expect(isUrlMatchedByPatterns('https://example.com', ['https://other.com'])).toBe(false)
  })

  it('matches when patterns array is empty', () => {
    expect(isUrlMatchedByPatterns('https://example.com', [])).toBe(true)
  })

  it('matches against multiple patterns', () => {
    const patterns = ['*://*.youtube.com/*', '*://*.google.com/*']
    expect(isUrlMatchedByPatterns('https://www.youtube.com/watch?v=123', patterns)).toBe(true)
    expect(isUrlMatchedByPatterns('https://www.google.com/search?q=test', patterns)).toBe(true)
    expect(isUrlMatchedByPatterns('https://example.com', patterns)).toBe(false)
  })

  it('handles invalid patterns gracefully', () => {
    expect(isUrlMatchedByPatterns('https://example.com', ['[invalid-regex'])).toBe(false)
  })

  it('matches with protocol-specific patterns', () => {
    expect(isUrlMatchedByPatterns('http://example.com/page', ['http://example.com/*'])).toBe(true)
    expect(isUrlMatchedByPatterns('https://example.com', ['http://example.com/*'])).toBe(false)
  })
})
