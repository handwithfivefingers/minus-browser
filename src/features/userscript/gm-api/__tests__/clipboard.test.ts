import { clipboard } from 'electron'

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { handleClipboard } from '~/features/userscript/gm-api/clipboard'

vi.mock('electron', () => ({
  clipboard: {
    writeText: vi.fn(),
    writeHTML: vi.fn(),
    writeImage: vi.fn(),
    writeRTF: vi.fn(),
  },
}))

describe('handleClipboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('writes text by default', () => {
    handleClipboard('GM_setClipboard', ['hello'])
    expect(clipboard.writeText).toHaveBeenCalledWith('hello')
  })

  it('writes text when type is text', () => {
    handleClipboard('GM_setClipboard', ['hello', { type: 'text' }])
    expect(clipboard.writeText).toHaveBeenCalledWith('hello')
  })

  it('writes HTML', () => {
    handleClipboard('GM_setClipboard', ['<b>bold</b>', { type: 'html' }])
    expect(clipboard.writeHTML).toHaveBeenCalledWith('<b>bold</b>')
  })

  it('writes RTF', () => {
    handleClipboard('GM_setClipboard', ['{\\rtf1}', { type: 'rtf' }])
    expect(clipboard.writeRTF).toHaveBeenCalledWith('{\\rtf1}')
  })

  it('throws when data is empty', () => {
    expect(() => handleClipboard('GM_setClipboard', ['', {}])).toThrow('Clipboard data is required')
    expect(() => handleClipboard('GM_setClipboard', [null, {}])).toThrow('Clipboard data is required')
    expect(() => handleClipboard('GM_setClipboard', [undefined, {}])).toThrow('Clipboard data is required')
  })

  it('falls back to text for unknown type', () => {
    handleClipboard('GM_setClipboard', ['data', { type: 'binary' }])
    expect(clipboard.writeText).toHaveBeenCalledWith('data')
  })

  it('converts data to string for text/html/rtf', () => {
    handleClipboard('GM_setClipboard', [42, { type: 'text' }])
    expect(clipboard.writeText).toHaveBeenCalledWith('42')
  })
})
