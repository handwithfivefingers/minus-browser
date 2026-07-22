import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SearchController, searchController } from '~/features/search/controllers'

const { mockEventStore } = vi.hoisted(() => ({
  mockEventStore: {
    listen: vi.fn(),
    broadcast: vi.fn(),
  },
}))

vi.mock('~/main/core/stores', () => ({
  eventStore: mockEventStore,
}))

describe('SearchController', () => {
  let controller: SearchController

  beforeEach(() => {
    vi.clearAllMocks()
    controller = new SearchController()
  })

  it('listens to viewChanges on construction', () => {
    expect(mockEventStore.listen).toHaveBeenCalledWith('viewChanges', expect.any(Function))
  })

  it('sets activeView when viewChanges fires', () => {
    const handler = mockEventStore.listen.mock.calls.find((c: any) => c[0] === 'viewChanges')[1]
    const mockView = {} as any
    handler(mockView)
    expect((controller as any).activeView).toBe(mockView)
  })

  it('sets activeView to null when viewChanges fires undefined', () => {
    const handler = mockEventStore.listen.mock.calls.find((c: any) => c[0] === 'viewChanges')[1]
    handler(undefined)
    expect((controller as any).activeView).toBeNull()
  })

  it('showSearchBar returns undefined when no activeView', async () => {
    const result = await controller.showSearchBar()
    expect(result).toBeUndefined()
  })

  it('stopSearch returns undefined when no activeView', async () => {
    const result = await controller.stopSearch()
    expect(result).toBeUndefined()
  })

  it('searchPage does nothing when no activeView', () => {
    expect(() => controller.searchPage({ query: 'test' })).not.toThrow()
  })

  it('searchPage does nothing when query is empty', () => {
    const mockView = { webContents: { stopFindInPage: vi.fn(), findInPage: vi.fn() } } as any
    const handler = mockEventStore.listen.mock.calls.find((c: any) => c[0] === 'viewChanges')[1]
    handler(mockView)
    controller.searchPage({ query: '' })
    expect(mockView.webContents.stopFindInPage).toHaveBeenCalledWith('clearSelection')
    expect(mockView.webContents.findInPage).not.toHaveBeenCalled()
  })

  it('calls findInPage with correct params', () => {
    const mockView = { webContents: { stopFindInPage: vi.fn(), findInPage: vi.fn() } } as any
    const handler = mockEventStore.listen.mock.calls.find((c: any) => c[0] === 'viewChanges')[1]
    handler(mockView)
    controller.searchPage({ query: 'test', forward: true, findNext: false, matchCase: true })
    expect(mockView.webContents.findInPage).toHaveBeenCalledWith('test', {
      forward: true,
      findNext: false,
      matchCase: true,
    })
  })

  it('searchController is a singleton', () => {
    expect(searchController).toBeDefined()
    expect(searchController).toBeInstanceOf(SearchController)
  })
})
