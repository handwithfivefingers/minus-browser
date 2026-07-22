// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'

import { debounce } from '~/main/core/utils/debounce'

describe('debounce (main)', () => {
  it('calls the function after the wait period', async () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 50)
    debounced('test')
    expect(fn).not.toHaveBeenCalled()
    await new Promise((r) => setTimeout(r, 80))
    expect(fn).toHaveBeenCalledWith('test')
  })

  it('cancels previous calls', async () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 50)
    debounced('a')
    debounced('b')
    await new Promise((r) => setTimeout(r, 80))
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('b')
  })

  it('handles no arguments', async () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 30)
    debounced()
    await new Promise((r) => setTimeout(r, 50))
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
