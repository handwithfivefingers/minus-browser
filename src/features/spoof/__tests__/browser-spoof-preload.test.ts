import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const preloadPath = path.resolve(__dirname, '..', 'browser-spoof-preload.ts')
const source = fs.readFileSync(preloadPath, 'utf-8')

describe('browser-spoof-preload', () => {
  it('calls webFrame.executeJavaScript', () => {
    expect(source).toMatch(/webFrame\.executeJavaScript/)
  })

  it('deletes navigator.webdriver', () => {
    expect(source).toContain('delete Navigator.prototype.webdriver')
    expect(source).toContain("Object.defineProperty(Navigator.prototype, 'webdriver'")
  })

  it('creates window.chrome object', () => {
    expect(source).toContain('window.chrome')
    expect(source).toContain('runtime:')
    expect(source).toContain('app:')
    expect(source).toContain('csi:')
    expect(source).toContain('loadTimes:')
    expect(source).toContain('webstore:')
  })

  it('wraps in IIFE', () => {
    expect(source.trim()).toMatch(/^import \{ webFrame \} from 'electron'/)
    expect(source).toContain('(function() {')
    expect(source).toContain('})();')
  })

  it('has makeEvent helper', () => {
    expect(source).toContain('var makeEvent = function()')
    expect(source).toContain('addListener: function() {}')
    expect(source).toContain('removeListener: function() {}')
    expect(source).toContain('hasListener: function() {}')
  })

  it('sets runtime chrome APIs', () => {
    expect(source).toContain('runtime:')
    expect(source).toContain('connect: function() {}')
    expect(source).toContain('sendMessage: function() {}')
    expect(source).toContain('getManifest: function() { return {}; }')
    expect(source).toContain('onConnect: makeEvent()')
    expect(source).toContain('onMessage: makeEvent()')
  })

  it('sets app chrome APIs', () => {
    expect(source).toContain("InstallState: { DISABLED: 'disabled'")
    expect(source).toContain("RunningState: { CANNOT_RUN: 'cannot_run'")
    expect(source).toContain('app:')
  })

  it('wraps everything in try/catch', () => {
    const tryBlocks = (source.match(/try \{/g) || []).length
    const catchBlocks = (source.match(/catch\(_\)/g) || []).length
    expect(tryBlocks).toBe(catchBlocks)
    expect(tryBlocks).toBeGreaterThanOrEqual(2)
  })
})
