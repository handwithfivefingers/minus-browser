import { describe, expect, it, vi } from 'vitest'

import { CacheSystem } from '~/features/cacheSystem'

describe('CacheSystem', () => {
  it('returns undefined for unset key', async () => {
    const cache = new CacheSystem()
    const result = await cache.get('tab')
    expect(result).toBeUndefined()
  })

  it('returns set value', async () => {
    const cache = new CacheSystem()
    cache.set('tab', { id: '1' })
    const result = await cache.get<{ id: string }>('tab')
    expect(result).toEqual({ id: '1' })
  })

  it('overwrites existing value on set', async () => {
    const cache = new CacheSystem()
    cache.set('tab', { id: '1' })
    cache.set('tab', { id: '2' })
    const result = await cache.get<{ id: string }>('tab')
    expect(result).toEqual({ id: '2' })
  })

  it('calls fallback when key not set', async () => {
    const cache = new CacheSystem()
    const fallback = vi.fn().mockResolvedValue('computed')
    const result = await cache.get('password', fallback)
    expect(result).toBe('computed')
    expect(fallback).toHaveBeenCalledOnce()
  })

  it('caches fallback result', async () => {
    const cache = new CacheSystem()
    const fallback = vi.fn().mockResolvedValue('computed')
    await cache.get('password', fallback)
    expect(fallback).toHaveBeenCalledOnce()
    const second = await cache.get('password', fallback)
    expect(second).toBe('computed')
    expect(fallback).toHaveBeenCalledOnce()
  })

  it('returns cached value even if fallback is provided', async () => {
    const cache = new CacheSystem()
    cache.set('session', 'cached')
    const fallback = vi.fn().mockResolvedValue('fallback')
    const result = await cache.get('session', fallback)
    expect(result).toBe('cached')
    expect(fallback).not.toHaveBeenCalled()
  })

  it('does not call fallback when fallback is undefined', async () => {
    const cache = new CacheSystem()
    const result = await cache.get('tab', undefined)
    expect(result).toBeUndefined()
  })

  it('deletes a key', async () => {
    const cache = new CacheSystem()
    cache.set('tab', { id: '1' })
    cache.delete('tab')
    const result = await cache.get('tab')
    expect(result).toBeUndefined()
  })

  it('handles delete on non-existent key without throwing', () => {
    const cache = new CacheSystem()
    expect(() => cache.delete('tab')).not.toThrow()
  })

  it('supports all collection types', () => {
    const cache = new CacheSystem()
    const collections = [
      'tab',
      'password',
      'userscripts',
      'passwordVault',
      'translate',
      'interface',
      'session',
      'tabGroups',
    ] as const
    for (const key of collections) {
      cache.set(key, { test: true })
      expect(cache.get(key)).resolves.toEqual({ test: true })
    }
  })

  it('fallback error returns undefined', async () => {
    const cache = new CacheSystem()
    const fallback = vi.fn().mockRejectedValue(new Error('db error'))
    const result = await cache.get('tab', fallback)
    expect(result).toBeUndefined()
  })

  it('returns undefined for falsy values (0, false, empty string)', async () => {
    const cache = new CacheSystem()
    cache.set('tab', 0)
    expect(await cache.get<number>('tab')).toBeUndefined()
    cache.set('tab', false)
    expect(await cache.get<boolean>('tab')).toBeUndefined()
    cache.set('tab', '')
    expect(await cache.get<string>('tab')).toBeUndefined()
  })

  it('returns undefined for unknown collection key', async () => {
    const cache = new CacheSystem()
    expect(await cache.get('tab' as any)).toBeUndefined()
  })
})
