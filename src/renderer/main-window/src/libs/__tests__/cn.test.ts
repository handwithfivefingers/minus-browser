import { describe, it, expect } from 'vitest'
import { cn } from '~/renderer/main-window/src/libs/cn'

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes via clsx', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  it('handles undefined and null', () => {
    expect(cn('a', undefined, null, 'b')).toBe('a b')
  })

  it('handles empty inputs', () => {
    expect(cn()).toBe('')
  })

  it('merges tailwind classes (twMerge)', () => {
    expect(cn('px-4', 'px-2')).toBe('px-2')
  })

  it('merges conflicting tailwind classes', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('handles object syntax', () => {
    expect(cn({ foo: true, bar: false })).toBe('foo')
  })
})
