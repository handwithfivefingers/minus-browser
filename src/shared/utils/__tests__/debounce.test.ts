import { describe, it, expect, vi } from 'vitest'

import { debounce } from '~/shared/utils/debounce'

describe('debounce', () => {
  it('calls the function after the wait period', async () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced('a')
    expect(fn).not.toHaveBeenCalled()
    await new Promise((r) => setTimeout(r, 150))
    expect(fn).toHaveBeenCalledWith('a')
  })

  it('calls the function with the latest arguments', async () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced('a')
    debounced('b')
    debounced('c')
    await new Promise((r) => setTimeout(r, 150))
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('c')
  })

  it('cancels previous pending calls', async () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 50)
    debounced('first')
    await new Promise((r) => setTimeout(r, 30))
    debounced('second')
    await new Promise((r) => setTimeout(r, 70))
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('second')
  })

  it('works with no arguments', async () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 50)
    debounced()
    await new Promise((r) => setTimeout(r, 100))
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('works with multiple arguments', async () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 50)
    debounced('a', 'b', 'c')
    await new Promise((r) => setTimeout(r, 100))
    expect(fn).toHaveBeenCalledWith('a', 'b', 'c')
  })
})
