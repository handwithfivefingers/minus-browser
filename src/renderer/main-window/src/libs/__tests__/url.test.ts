import { describe, it, expect } from 'vitest'
import {
  isValidDomainOrIP,
  getAddressType,
  navigateOrSearch,
  debounce,
  isValidDomainOrIPSimple,
} from '~/renderer/main-window/src/libs'

describe('isValidDomainOrIP', () => {
  it('validates domain names', () => {
    expect(isValidDomainOrIP('example.com')).toBe(true)
    expect(isValidDomainOrIP('sub.example.com')).toBe(true)
    expect(isValidDomainOrIP('landing.flodev.net')).toBe(true)
  })

  it('validates localhost', () => {
    expect(isValidDomainOrIP('localhost')).toBe(true)
  })

  it('validates IPv4 addresses', () => {
    expect(isValidDomainOrIP('192.168.1.1')).toBe(true)
    expect(isValidDomainOrIP('10.0.0.255')).toBe(true)
    expect(isValidDomainOrIP('http://127.0.0.1:8080')).toBe(true)
  })

  it('validates IPv6 addresses', () => {
    expect(isValidDomainOrIP('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true)
  })

  it('validates IPv6 with brackets', () => {
    expect(isValidDomainOrIP('[2001:db8::1]:8080')).toBe(true)
  })

  it('validates ::1 via isValidDomainOrIPSimple', () => {
    expect(isValidDomainOrIPSimple('[::1]')).toBe(true)
  })

  it('rejects invalid IPs', () => {
    expect(isValidDomainOrIP('999.999.999.999')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidDomainOrIP('')).toBe(false)
  })
})

describe('getAddressType', () => {
  it('identifies localhost', () => {
    expect(getAddressType('localhost')).toBe('localhost')
    expect(getAddressType('http://localhost:3000')).toBe('localhost')
  })

  it('identifies IPv4', () => {
    expect(getAddressType('192.168.1.1')).toBe('ipv4')
    expect(getAddressType('10.0.0.1')).toBe('ipv4')
  })

  it('identifies IPv6 (with brackets)', () => {
    expect(getAddressType('[2001:db8::1]')).toBe('ipv6')
  })

  it('identifies domains', () => {
    expect(getAddressType('example.com')).toBe('domain')
    expect(getAddressType('sub.example.com')).toBe('domain')
  })

  it('identifies invalid addresses', () => {
    expect(getAddressType('')).toBe('invalid')
    expect(getAddressType('999.999.999.999')).toBe('invalid')
  })
})

describe('navigateOrSearch', () => {
  it('returns URL with explicit protocol as-is', () => {
    expect(navigateOrSearch('https://example.com')).toBe('https://example.com')
    expect(navigateOrSearch('http://example.com')).toBe('http://example.com')
    expect(navigateOrSearch('ftp://files.com')).toBe('ftp://files.com')
  })

  it('prefixes http:// to localhost and IPs', () => {
    expect(navigateOrSearch('localhost:3000')).toBe('http://localhost:3000')
    expect(navigateOrSearch('127.0.0.1')).toBe('http://127.0.0.1')
    expect(navigateOrSearch('192.168.1.1:8080')).toBe('http://192.168.1.1:8080')
  })

  it('prefixes https:// to domain names', () => {
    expect(navigateOrSearch('example.com')).toBe('https://example.com')
    expect(navigateOrSearch('sub.example.com/path')).toBe('https://sub.example.com/path')
  })

  it('treats non-domain input as search query', () => {
    const searchUrl = 'https://google.com/search?q='
    expect(navigateOrSearch('hello world', searchUrl)).toBe('https://google.com/search?q=hello%20world')
    expect(navigateOrSearch('react testing', searchUrl)).toBe('https://google.com/search?q=react%20testing')
  })

  it('returns undefined for empty input', () => {
    expect(navigateOrSearch('')).toBeUndefined()
    expect(navigateOrSearch('   ')).toBeUndefined()
  })
})

describe('debounce (renderer)', () => {
  it('delays function execution', async () => {
    let called = false
    const debounced = debounce(() => {
      called = true
    }, 50)
    debounced()
    expect(called).toBe(false)
    await new Promise((r) => setTimeout(r, 80))
    expect(called).toBe(true)
  })
})
