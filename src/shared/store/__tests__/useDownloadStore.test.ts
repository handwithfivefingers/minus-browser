import { beforeEach, describe, expect, it } from 'vitest'

import { useDownloadStore } from '~/shared/store/useDownloadStore'
import { DownloadItem } from '~/shared/types/download'

function makeItem(id: string, partial: Partial<DownloadItem> = {}): DownloadItem {
  return {
    id,
    filename: 'file.bin',
    url: 'https://example.com/file.bin',
    savePath: '/tmp/Downloads/file.bin',
    totalBytes: 100,
    receivedBytes: 0,
    progress: 0,
    state: 'progressing',
    canResume: false,
    startedAt: 1,
    ...partial,
  }
}

describe('useDownloadStore', () => {
  beforeEach(() => {
    useDownloadStore.getState().clear()
  })

  it('sets the full list', () => {
    const a = makeItem('a')
    const b = makeItem('b')
    useDownloadStore.getState().setDownloads([a, b])
    expect(useDownloadStore.getState().downloads).toHaveLength(2)
  })

  it('upserts a new item at the front', () => {
    useDownloadStore.getState().upsert(makeItem('a'))
    useDownloadStore.getState().upsert(makeItem('b'))
    const ids = useDownloadStore.getState().downloads.map((d) => d.id)
    expect(ids).toEqual(['b', 'a'])
  })

  it('upsert updates an existing item by id', () => {
    useDownloadStore.getState().upsert(makeItem('a', { progress: 10 }))
    useDownloadStore.getState().upsert(makeItem('a', { progress: 50, receivedBytes: 50 }))
    expect(useDownloadStore.getState().downloads).toHaveLength(1)
    expect(useDownloadStore.getState().downloads[0].progress).toBe(50)
  })

  it('removes an item by id', () => {
    useDownloadStore.getState().setDownloads([makeItem('a'), makeItem('b')])
    useDownloadStore.getState().remove('a')
    expect(useDownloadStore.getState().downloads.map((d) => d.id)).toEqual(['b'])
  })

  it('clears the list', () => {
    useDownloadStore.getState().setDownloads([makeItem('a')])
    useDownloadStore.getState().clear()
    expect(useDownloadStore.getState().downloads).toHaveLength(0)
  })
})
