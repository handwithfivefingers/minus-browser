import { describe, it, expect } from 'vitest'

import { parseUserScriptMetadata, generateMetadataBlock } from '../parser/metadata'

const SCRIPT_WITH_META = `// ==UserScript==
// @name         Test Script
// @namespace    http://example.com/
// @version      1.2.3
// @description  A test userscript
// @author       Test Author
// @match        *://*.example.com/*
// @match        *://*.google.com/*
// @exclude      *://*.example.com/excluded
// @include      *://*.included.com/*
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @resource     icon /assets/icon.png
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// @noframes
// @icon         https://example.com/favicon.ico
// @downloadURL  https://example.com/script.user.js
// @updateURL    https://example.com/script.meta.js
// @supportURL   https://example.com/support
// @homepageURL  https://example.com/
// @license      MIT
// @connect      api.example.com
// @connect      api2.example.com
// ==/UserScript==

console.log("Hello from userscript!");`

const SCRIPT_WITHOUT_META = `console.log("No metadata here");`

const SCRIPT_MINIMAL = `// ==UserScript==
// @name Minimal
// @match *://*/*
// ==/UserScript==

alert("hi");`

describe('parseUserScriptMetadata', () => {
  it('parses full metadata block', () => {
    const meta = parseUserScriptMetadata(SCRIPT_WITH_META)
    expect(meta).not.toBeNull()
    expect(meta!.name).toBe('Test Script')
    expect(meta!.namespace).toBe('http://example.com/')
    expect(meta!.version).toBe('1.2.3')
    expect(meta!.description).toBe('A test userscript')
    expect(meta!.author).toBe('Test Author')
    expect(meta!.matches).toEqual(['*://*.example.com/*', '*://*.google.com/*'])
    expect(meta!.excludes).toEqual(['*://*.example.com/excluded'])
    expect(meta!.includes).toEqual(['*://*.included.com/*'])
    expect(meta!.requires).toEqual([{ url: 'https://code.jquery.com/jquery-3.6.0.min.js' }])
    expect(meta!.resources).toEqual([{ name: 'icon', url: '/assets/icon.png' }])
    expect(meta!.grants).toEqual(['GM_getValue', 'GM_setValue', 'GM_xmlhttpRequest'])
    expect(meta!.runAt).toBe('document-idle')
    expect(meta!.noframes).toBe(true)
    expect(meta!.icon).toBe('https://example.com/favicon.ico')
    expect(meta!.downloadURL).toBe('https://example.com/script.user.js')
    expect(meta!.updateURL).toBe('https://example.com/script.meta.js')
    expect(meta!.supportURL).toBe('https://example.com/support')
    expect(meta!.homepageURL).toBe('https://example.com/')
    expect(meta!.license).toBe('MIT')
    expect(meta!.connect).toEqual(['api.example.com', 'api2.example.com'])
  })

  it('returns null when no metadata block', () => {
    const meta = parseUserScriptMetadata(SCRIPT_WITHOUT_META)
    expect(meta).toBeNull()
  })

  it('parses minimal metadata block', () => {
    const meta = parseUserScriptMetadata(SCRIPT_MINIMAL)
    expect(meta).not.toBeNull()
    expect(meta!.name).toBe('Minimal')
    expect(meta!.matches).toEqual(['*://*/*'])
    expect(meta!.runAt).toBe('document-start')
    expect(meta!.grants).toEqual([])
    expect(meta!.noframes).toBe(false)
  })

  it('handles multiple directives of same type', () => {
    const multiGrant = `// ==UserScript==
// @name MultiGrant
// @grant GM_getValue
// @grant GM_setValue
// @grant GM_xmlhttpRequest
// @grant GM_notification
// ==/UserScript==
code();`
    const meta = parseUserScriptMetadata(multiGrant)
    expect(meta!.grants).toHaveLength(4)
    expect(meta!.grants).toEqual(['GM_getValue', 'GM_setValue', 'GM_xmlhttpRequest', 'GM_notification'])
  })

  it('parses @resource with name and URL', () => {
    const src = `// ==UserScript==
// @name Res
// @resource myCss https://example.com/style.css
// @resource myJs https://example.com/script.js
// ==/UserScript==
code();`
    const meta = parseUserScriptMetadata(src)
    expect(meta!.resources).toHaveLength(2)
    expect(meta!.resources[0]).toEqual({ name: 'myCss', url: 'https://example.com/style.css' })
    expect(meta!.resources[1]).toEqual({ name: 'myJs', url: 'https://example.com/script.js' })
  })

  it('handles @run-at aliases (run_at, run-at)', () => {
    const srcRunAt = `// ==UserScript==
// @name Test
// @run-at document-end
// ==/UserScript==
code();`
    expect(parseUserScriptMetadata(srcRunAt)!.runAt).toBe('document-end')

    const srcRun_at = `// ==UserScript==
// @name Test
// @run_at document-idle
// ==/UserScript==
code();`
    expect(parseUserScriptMetadata(srcRun_at)!.runAt).toBe('document-idle')
  })

  it('handles @icon aliases', () => {
    const srcIconURL = `// ==UserScript==
// @name Test
// @iconURL https://example.com/icon.png
// ==/UserScript==
code();`
    expect(parseUserScriptMetadata(srcIconURL)!.icon).toBe('https://example.com/icon.png')

    const srcDefaultIcon = `// ==UserScript==
// @name Test
// @defaulticon https://example.com/icon2.png
// ==/UserScript==
code();`
    expect(parseUserScriptMetadata(srcDefaultIcon)!.icon).toBe('https://example.com/icon2.png')
  })

  it('handles @homepage aliases', () => {
    const srcHomepage = `// ==UserScript==
// @name Test
// @homepage https://example.com/
// ==/UserScript==
code();`
    expect(parseUserScriptMetadata(srcHomepage)!.homepageURL).toBe('https://example.com/')

    const srcWebsite = `// ==UserScript==
// @name Test
// @website https://mysite.com/
// ==/UserScript==
code();`
    expect(parseUserScriptMetadata(srcWebsite)!.homepageURL).toBe('https://mysite.com/')
  })

  it('preserves first @name when multiple present', () => {
    const src = `// ==UserScript==
// @name First Name
// @name Second Name
// ==/UserScript==
code();`
    expect(parseUserScriptMetadata(src)!.name).toBe('First Name')
  })

  it('returns empty name for block with only directives', () => {
    const src = `// ==UserScript==
// @grant GM_getValue
// ==/UserScript==
code();`
    const meta = parseUserScriptMetadata(src)
    expect(meta!.name).toBe('')
    expect(meta!.grants).toEqual(['GM_getValue'])
  })
})

describe('generateMetadataBlock', () => {
  it('generates metadata from partial input', () => {
    const result = generateMetadataBlock({
      name: 'Generated',
      matches: ['*://example.com/*'],
      grants: ['GM_getValue'],
      runAt: 'document-start',
    })
    expect(result).toContain('// ==UserScript==')
    expect(result).toContain('// @name         Generated')
    expect(result).toContain('// @match        *://example.com/*')
    expect(result).toContain('// @grant        GM_getValue')
    expect(result).toContain('// ==/UserScript==')
  })

  it('includes @noframes when true', () => {
    const result = generateMetadataBlock({
      name: 'Test',
      noframes: true,
    })
    expect(result).toContain('// @noframes')
  })

  it('handles empty resources', () => {
    const result = generateMetadataBlock({
      name: 'Empty',
      resources: [],
    })
    expect(result).not.toContain('// @resource')
  })
})
