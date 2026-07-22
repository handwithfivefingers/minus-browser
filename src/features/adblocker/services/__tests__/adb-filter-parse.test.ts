import { describe, expect, it } from 'vitest'

import {
  getUrlHost,
  isSameOriginHost,
  matches,
  matchesFilters,
  parse,
} from '~/features/adblocker/services/adb-filter-parse'

describe('getUrlHost', () => {
  it('extracts host from URL', () => {
    expect(getUrlHost('https://example.com/path')).toBe('example.com')
    expect(getUrlHost('http://sub.example.com:8080/path?q=1')).toBe('sub.example.com')
    expect(getUrlHost('https://www.google.com/search?q=test')).toBe('www.google.com')
  })
})

describe('isSameOriginHost', () => {
  it('returns true for exact match', () => {
    expect(isSameOriginHost('example.com', 'example.com')).toBe(true)
  })

  it('returns true for subdomain', () => {
    expect(isSameOriginHost('example.com', 'sub.example.com')).toBe(true)
  })

  it('returns false for different domain', () => {
    expect(isSameOriginHost('example.com', 'other.com')).toBe(false)
  })

  it('returns false for unrelated domain that ends with same string', () => {
    expect(isSameOriginHost('example.com', 'notexample.com')).toBe(false)
  })
})

describe('parseFilter', () => {
  it('handles empty input without error', () => {
    const parserData: any = {}
    parse('', parserData, undefined, { async: false })
    expect(parserData.nonAnchoredString).toBeDefined()
  })

  it('ignores comments and parses non-comment filters', () => {
    const parserData: any = {}
    parse('! comment\n[Adblock Plus 2.0]\n||example.com/ads/tracker.js\n', parserData, undefined, { async: false })
    expect(parserData.leftAnchored).toBeDefined()
  })

  it('parses basic host-anchored filter', () => {
    const parserData: any = {}
    parse('||example.com/ads/tracker.js\n', parserData, undefined, { async: false })
    expect(parserData.leftAnchored).toBeDefined()
  })
})

describe('parse', () => {
  it('parses exception filters separately', () => {
    const parserData: any = {}
    parse('||example.com/blocked.js\n@@||example.com/allowed.js\n', parserData, undefined, { async: false })
    expect(parserData.exceptionFilters).toBeDefined()
    expect(parserData.leftAnchored).toBeDefined()
  })

  it('handles multiple filters with different types', () => {
    const parserData: any = {}
    parse('/ads/\n/analytics.js\n! comment\n||tracker.com^\n@@||whitelisted.com^\n', parserData, undefined, {
      async: false,
    })
    expect(parserData.regex.length).toBe(1)
    expect(parserData.nonAnchoredString).toBeDefined()
    expect(parserData.leftAnchored).toBeDefined()
  })

  it('parses filters with options', () => {
    const parserData: any = {}
    parse('||example.com/ads.js$script,domain=example.com\n', parserData, undefined, { async: false })
    expect(parserData.leftAnchored).toBeDefined()
  })
})

describe('parseFilter regex detection', () => {
  it('detects and parses regex filters', () => {
    const parserData: any = {}
    parse('/doubleclick/\n', parserData, undefined, { async: false })
    expect(parserData.regex.length).toBe(1)
    expect(parserData.regex[0].regex).toBeDefined()
    expect(parserData.regex[0].regex.test('https://doubleclick.net/ads')).toBe(true)
  })
})

describe('matches', () => {
  it('returns false when parser not initialized', () => {
    const filters: any = { initialized: false }
    expect(matches(filters, 'https://example.com', { elementType: 'script', domain: 'example.com' })).toBe(false)
  })

  it('returns false when exception filter matches', () => {
    const parserData: any = {}
    parse('/ad-banner.png\n@@||example.com/ad-banner.png\n', parserData, undefined, { async: false })
    const result = matches(parserData, 'https://example.com/ad-banner.png', {
      elementType: 'image',
      domain: 'example.com',
    })
    expect(result).toBe(false)
  })
})

describe('matchesFilters', () => {
  it('matches host-anchored filters', () => {
    const parserData: any = {}
    parse('||example.com\n', parserData, undefined, { async: false })
    const result = matchesFilters(parserData, 'https://example.com/ad.js', {
      elementType: 'script',
      domain: 'example.com',
    })
    expect(result).toBe(true)
  })

  it('parses regex filters but regex matching is handled by @ghostery/adblocker', () => {
    const parserData: any = {}
    parse('/doubleclick/\n', parserData, undefined, { async: false })
    expect(parserData.regex.length).toBe(1)
    expect(parserData.regex[0].regex.test('https://doubleclick.net/ads')).toBe(true)
  })

  it('matches both-anchored filters (exact match)', () => {
    const parserData: any = {}
    parse('||example.com/exact.js|\n', parserData, undefined, { async: false })
    const result = matchesFilters(parserData, 'example.com/exact.js', { elementType: 'script', domain: 'example.com' })
    expect(result).toBe(true)
  })

  it('respects domain option', () => {
    const parserData: any = {}
    parse('||example.com/ads.js$domain=example.com\n', parserData, undefined, { async: false })
    const matchOnDomain = matchesFilters(parserData, 'https://example.com/ads.js', {
      elementType: 'script',
      domain: 'example.com',
    })
    expect(matchOnDomain).toBe(true)
    const noMatchOtherDomain = matchesFilters(parserData, 'https://example.com/ads.js', {
      elementType: 'script',
      domain: 'other.com',
    })
    expect(noMatchOtherDomain).toBe(false)
  })

  it('respects skip-domain option (~domain)', () => {
    const parserData: any = {}
    parse('||example.com/ads.js$domain=~blocked.com\n', parserData, undefined, { async: false })
    const matchOnNormalDomain = matchesFilters(parserData, 'https://example.com/ads.js', {
      elementType: 'script',
      domain: 'normal.com',
    })
    expect(matchOnNormalDomain).toBe(true)
    const noMatchOnBlocked = matchesFilters(parserData, 'https://example.com/ads.js', {
      elementType: 'script',
      domain: 'blocked.com',
    })
    expect(noMatchOnBlocked).toBe(false)
  })

  it('respects element type option', () => {
    const parserData: any = {}
    parse('||example.com/ads.js$script\n', parserData, undefined, { async: false })
    const matchScript = matchesFilters(parserData, 'https://example.com/ads.js', {
      elementType: 'script',
      domain: 'example.com',
    })
    expect(matchScript).toBe(true)
    const noMatchImage = matchesFilters(parserData, 'https://example.com/ads.js', {
      elementType: 'image',
      domain: 'example.com',
    })
    expect(noMatchImage).toBe(false)
  })

  it('respects third-party option', () => {
    const parserData: any = {}
    parse('||example.com/tracker.js$third-party\n', parserData, undefined, { async: false })
    const matchThirdParty = matchesFilters(parserData, 'https://example.com/tracker.js', {
      elementType: 'script',
      domain: 'other.com',
    })
    expect(matchThirdParty).toBe(true)
    const noMatchFirstParty = matchesFilters(parserData, 'https://example.com/tracker.js', {
      elementType: 'script',
      domain: 'example.com',
    })
    expect(noMatchFirstParty).toBe(false)
  })

  it('respects ~third-party option', () => {
    const parserData: any = {}
    parse('||example.com/first.js$~third-party\n', parserData, undefined, { async: false })
    const matchFirstParty = matchesFilters(parserData, 'https://example.com/first.js', {
      elementType: 'script',
      domain: 'example.com',
    })
    expect(matchFirstParty).toBe(true)
    const noMatchThirdParty = matchesFilters(parserData, 'https://example.com/first.js', {
      elementType: 'script',
      domain: 'other.com',
    })
    expect(noMatchThirdParty).toBe(false)
  })

  it('matches against nonAnchoredString filters', () => {
    const parserData: any = {}
    parse('/ads/tracker\n', parserData, undefined, { async: false })
    const result = matchesFilters(parserData, 'https://example.com/ads/tracker.js', {
      elementType: 'script',
      domain: 'example.com',
    })
    expect(result).toBe(true)
  })

  it('matches wildcard patterns', () => {
    const parserData: any = {}
    parse('*example.com*/tracker*\n', parserData, undefined, { async: false })
    const result = matchesFilters(parserData, 'https://sub.example.com/path/to/tracker/file', {
      elementType: 'script',
      domain: 'example.com',
    })
    expect(result).toBe(true)
  })
})

describe('element hiding rules', () => {
  it('skips element hiding rules', () => {
    const parserData: any = {}
    parse('example.com##.ad-banner\n', parserData, undefined, { async: false })
    const result = matchesFilters(parserData, 'https://example.com/', {
      elementType: 'document',
      domain: 'example.com',
    })
    expect(result).toBe(false)
  })
})
