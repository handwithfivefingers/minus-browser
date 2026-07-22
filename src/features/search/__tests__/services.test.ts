import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('electron', () => ({
  clipboard: {},
}))

import { SearchService } from '~/features/search/services'

describe('SearchService', () => {
  let service: SearchService

  beforeEach(() => {
    service = new SearchService()
  })

  it('showSearchBar calls executeJavaScript on view', async () => {
    const executeJavaScript = vi.fn().mockResolvedValue(true)
    const mockView = { webContents: { executeJavaScript } } as any
    const result = await service.showSearchBar(mockView)
    expect(result).toBe(true)
    expect(executeJavaScript).toHaveBeenCalledOnce()
    const script = executeJavaScript.mock.calls[0][0] as string
    expect(script).toContain('__minus_search_bar')
    expect(script).toContain('__minus_search_input')
    expect(script).toContain('__minus_search_prev')
    expect(script).toContain('__minus_search_next')
  })

  it('showSearchBar returns false on error', async () => {
    const executeJavaScript = vi.fn().mockRejectedValue(new Error('injection failed'))
    const mockView = { webContents: { executeJavaScript } } as any
    const result = await service.showSearchBar(mockView)
    expect(result).toBe(false)
  })

  it('hideSearchBar calls executeJavaScript with removal script', async () => {
    const executeJavaScript = vi.fn().mockResolvedValue(undefined)
    const stopFindInPage = vi.fn()
    const mockView = { webContents: { executeJavaScript, stopFindInPage } } as any
    await service.hideSearchBar(mockView)
    const script = executeJavaScript.mock.calls[0][0] as string
    expect(script).toContain('__minus_search_bar')
    expect(script).toContain('.remove()')
    expect(stopFindInPage).toHaveBeenCalledWith('clearSelection')
  })

  it('hideSearchBar does not throw on error', async () => {
    const executeJavaScript = vi.fn().mockRejectedValue(new Error('error'))
    const mockView = { webContents: { executeJavaScript, stopFindInPage: vi.fn() } } as any
    await expect(service.hideSearchBar(mockView)).resolves.toBeUndefined()
  })

  it('updateSearchCount sets match count text', async () => {
    const executeJavaScript = vi.fn().mockResolvedValue(undefined)
    const mockWebContents = { executeJavaScript } as any
    await service.updateSearchCount(mockWebContents, 2, 5)
    const script = executeJavaScript.mock.calls[0][0] as string
    expect(script).toContain('2 / 5')
    expect(script).toContain('no-match')
  })

  it('updateSearchCount shows "no results" when matches is 0', async () => {
    const executeJavaScript = vi.fn().mockResolvedValue(undefined)
    const mockWebContents = { executeJavaScript } as any
    await service.updateSearchCount(mockWebContents, 0, 0)
    const script = executeJavaScript.mock.calls[0][0] as string
    expect(script).toContain('no results')
    expect(script).toContain('classList.toggle("no-match", true)')
  })
})
