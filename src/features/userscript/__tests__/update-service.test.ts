import { describe, it, expect } from 'vitest'

// Inline the version comparison logic from update-service for testing
function parseVersion(version: string | undefined | null): number[] {
  if (!version) return [0]
  return version.split('.').map((s) => {
    const n = parseInt(s, 10)
    return isNaN(n) ? 0 : n
  })
}

function isNewerVersion(current: string, remote: string): boolean {
  const curParts = parseVersion(current)
  const remParts = parseVersion(remote)
  const maxLen = Math.max(curParts.length, remParts.length)
  for (let i = 0; i < maxLen; i++) {
    const c = curParts[i] || 0
    const r = remParts[i] || 0
    if (r > c) return true
    if (r < c) return false
  }
  return false
}

describe('isNewerVersion', () => {
  it('detects newer major version', () => {
    expect(isNewerVersion('1.0.0', '2.0.0')).toBe(true)
  })

  it('detects newer minor version', () => {
    expect(isNewerVersion('1.0.0', '1.1.0')).toBe(true)
  })

  it('detects newer patch version', () => {
    expect(isNewerVersion('1.0.0', '1.0.1')).toBe(true)
  })

  it('returns false for same version', () => {
    expect(isNewerVersion('1.2.3', '1.2.3')).toBe(false)
  })

  it('returns false for older version', () => {
    expect(isNewerVersion('2.0.0', '1.9.9')).toBe(false)
  })

  it('handles versions with different segment lengths', () => {
    expect(isNewerVersion('1.0', '1.0.1')).toBe(true)
    expect(isNewerVersion('1.0.1', '1.0')).toBe(false)
  })

  it('handles null/undefined as 0.0.0', () => {
    expect(isNewerVersion('0.0.0', '1.0.0')).toBe(true)
    expect(isNewerVersion('1.0.0', null as any)).toBe(false)
  })

  it('handles pre-release-style versions', () => {
    expect(isNewerVersion('1.0.0-alpha', '1.0.0')).toBe(false)
    expect(isNewerVersion('1.0.0', '1.0.0-beta')).toBe(false)
  })
})
