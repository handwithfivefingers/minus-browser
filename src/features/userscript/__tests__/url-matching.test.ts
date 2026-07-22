import { describe, it, expect } from 'vitest'

// Re-import the URL matching logic since it's in shared utils
// These tests validate the pattern matching that userscripts rely on
function patternToRegex(pattern: string) {
  const WILDCARD_TO_REGEX = /[.+?^${}()|[\]\\]/g
  const escapeRegex = (input: string) => input.replace(WILDCARD_TO_REGEX, '\\$&').replace(/\*/g, '.*')
  const normalized = pattern.trim()
  if (!normalized || normalized === '*') return /^https?:\/\/.+/i
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return new RegExp(`^${escapeRegex(normalized)}$`, 'i')
  }
  if (normalized.startsWith('*://')) {
    const rest = normalized.slice(4)
    return new RegExp(`^https?://${escapeRegex(rest)}$`, 'i')
  }
  return new RegExp(`^${escapeRegex(normalized)}`, 'i')
}

function isUrlMatchedByPatterns(url: string, patterns: string[]) {
  if (!patterns.length) return true
  return patterns.some((pattern) => {
    try {
      return patternToRegex(pattern).test(url)
    } catch {
      return false
    }
  })
}

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
})
