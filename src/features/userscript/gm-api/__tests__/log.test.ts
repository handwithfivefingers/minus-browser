import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleLog } from '~/features/userscript/gm-api/log'

describe('handleLog', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {
      //
    })
  })

  it('logs message with script prefix', () => {
    handleLog('script-1', ['hello world'])
    expect(console.log).toHaveBeenCalledWith('[UserScript:script-1]', 'hello world')
  })

  it('logs message with rest args', () => {
    handleLog('script-1', ['count:', 42, { key: 'val' }])
    expect(console.log).toHaveBeenCalledWith('[UserScript:script-1]', 'count:', 42, { key: 'val' })
  })

  it('handles empty args array', () => {
    handleLog('script-1', [])
    expect(console.log).toHaveBeenCalledWith('[UserScript:script-1]', undefined)
  })

  it('logs with different script IDs', () => {
    handleLog('abc-123', ['test'])
    expect(console.log).toHaveBeenCalledWith('[UserScript:abc-123]', 'test')
  })
})
