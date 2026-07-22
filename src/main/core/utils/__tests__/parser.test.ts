// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'

import { isUrlMatchedByPatterns, isSameURl, parseUserScriptMeta } from '~/main/core/utils/parser'

describe('parseUserScriptMeta', () => {
  it('parses name and match from a valid metadata block', () => {
    const src = '// ==UserScript==\n// @name Test Script\n// @match *://*.example.com/*\n// ==/UserScript==\ncode();'
    const result = parseUserScriptMeta(src)
    expect(result.name).toBe('Test Script')
    expect(result.matches).toEqual(['*://*.example.com/*'])
    expect(result.runAt).toBe('document-start')
  })

  it('returns default name when no @name present', () => {
    const src = '// ==UserScript==\n// @match *://*/*\n// ==/UserScript=='
    const result = parseUserScriptMeta(src)
    expect(result.name).toBe('Custom Script')
    expect(result.matches).toEqual(['*://*/*'])
  })

  it('returns empty arrays when no metadata block', () => {
    const result = parseUserScriptMeta('console.log("no metadata");')
    expect(result.name).toBe('Custom Script')
    expect(result.matches).toEqual([])
    expect(result.excludes).toEqual([])
  })

  it('parses @run-at directive', () => {
    const src = '// ==UserScript==\n// @name Test\n// @run-at document-idle\n// ==/UserScript=='
    expect(parseUserScriptMeta(src).runAt).toBe('document-idle')
  })

  it('parses @exclude directives', () => {
    const src =
      '// ==UserScript==\n// @name Test\n// @match *://*/*\n// @exclude *://*.excluded.com/*\n// ==/UserScript=='
    const result = parseUserScriptMeta(src)
    expect(result.excludes).toEqual(['*://*.excluded.com/*'])
  })

  it('preserves first @name when multiple present', () => {
    const src = '// ==UserScript==\n// @name First\n// @name Second\n// ==/UserScript=='
    expect(parseUserScriptMeta(src).name).toBe('First')
  })
})

describe('isUrlMatchedByPatterns (main)', () => {
  it('matches wildcard patterns', () => {
    expect(isUrlMatchedByPatterns('https://www.example.com/page', ['*://*.example.com/*'])).toBe(true)
    expect(isUrlMatchedByPatterns('https://other.com', ['*://*.example.com/*'])).toBe(false)
  })

  it('matches exact URLs', () => {
    expect(isUrlMatchedByPatterns('https://example.com/page', ['https://example.com/page'])).toBe(true)
  })

  it('matches when patterns array is empty', () => {
    expect(isUrlMatchedByPatterns('https://example.com', [])).toBe(true)
  })
})

describe('isSameURl (main)', () => {
  it('returns true for identical URLs', () => {
    expect(isSameURl('https://example.com/path', 'https://example.com/path')).toBe(true)
  })

  it('returns false for different URLs', () => {
    expect(isSameURl('https://example.com/a', 'https://example.com/b')).toBe(false)
  })

  it('returns false for invalid URLs', () => {
    expect(isSameURl('invalid', 'https://example.com')).toBe(false)
  })
})
