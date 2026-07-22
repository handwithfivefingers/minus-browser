import { describe, expect, it, vi } from 'vitest'

import { capturePage } from '~/features/capture/services'

const mockImage = {
  toJPEG: vi.fn().mockReturnValue(Buffer.from('jpeg-data')),
}

const mockWebContents = {
  capturePage: vi.fn().mockResolvedValue(mockImage),
}

describe('capturePage', () => {
  it('captures full page without rect', async () => {
    const result = await capturePage(mockWebContents as any)
    expect(mockWebContents.capturePage).toHaveBeenCalledWith(undefined)
    expect(mockImage.toJPEG).toHaveBeenCalledWith(80)
    expect(result.dataURL).toBe('data:image/jpeg;base64,' + Buffer.from('jpeg-data').toString('base64'))
    expect(result.nativeImage).toBe(mockImage)
  })

  it('captures region with rect', async () => {
    const rect = { x: 0, y: 0, width: 100, height: 200 }
    await capturePage(mockWebContents as any, rect)
    expect(mockWebContents.capturePage).toHaveBeenCalledWith(rect)
  })

  it('uses custom jpeg quality', async () => {
    await capturePage(mockWebContents as any, undefined, 50)
    expect(mockImage.toJPEG).toHaveBeenCalledWith(50)
  })
})
