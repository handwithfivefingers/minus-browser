// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { MediaVideo } from '~/shared/types'

import { MediaListController } from '../controller'

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }))

vi.mock('~/features/sub-window/service', () => ({
  subWindowService: { send: mockSend },
}))

function makeVideo(id: number, overrides: Partial<MediaVideo> = {}) {
  return {
    id,
    title: 'Video',
    src: '',
    currentTime: 0,
    duration: 120,
    paused: false,
    poster: '',
    ...overrides,
  }
}

describe('MediaListController dedupe', () => {
  let controller: MediaListController

  beforeEach(() => {
    vi.clearAllMocks()
    controller = new MediaListController()
    controller.setMainWindow({ webContents: { send: vi.fn() } } as any)
  })

  it('drops identical videos reported with the same real source', () => {
    controller.updateTabVideos('tab-1', [
      makeVideo(0, { src: 'https://cdn.example.com/a.mp4' }),
      makeVideo(1, { src: 'https://cdn.example.com/a.mp4' }),
    ])
    const tabs = controller.getAggregate()
    expect(tabs).toHaveLength(1)
    expect(tabs[0].videos).toHaveLength(1)
    expect(tabs[0].videos[0].id).toBe(0)
  })

  it('drops duplicate blob/MSE videos (same title + duration) keeping the first id', () => {
    controller.updateTabVideos('tab-1', [
      makeVideo(0, { src: 'blob:https://www.youtube.com/aaa', title: 'Some Video' }),
      makeVideo(1, { src: 'blob:https://www.youtube.com/bbb', title: 'Some Video' }),
    ])
    const tabs = controller.getAggregate()
    expect(tabs).toHaveLength(1)
    expect(tabs[0].videos).toHaveLength(1)
    expect(tabs[0].videos[0].id).toBe(0)
  })

  it('keeps distinct videos', () => {
    controller.updateTabVideos('tab-1', [
      makeVideo(0, { src: 'https://cdn.example.com/a.mp4', title: 'A' }),
      makeVideo(1, { src: 'blob:https://cdn.example.com/bbb', title: 'B', duration: 300 }),
    ])
    const tabs = controller.getAggregate()
    expect(tabs[0].videos).toHaveLength(2)
  })

  it('does not leak state between tabs', () => {
    controller.updateTabVideos('tab-1', [makeVideo(0, { src: 'https://cdn.example.com/a.mp4' })])
    controller.updateTabVideos('tab-2', [makeVideo(0, { src: 'https://cdn.example.com/a.mp4' })])
    expect(controller.getAggregate()).toHaveLength(2)
  })
})
