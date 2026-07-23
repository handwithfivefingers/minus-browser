import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    run: vi.fn(),
    get: vi.fn(),
    query: vi.fn(),
    transaction: vi.fn((fn: () => void) => fn()),
  },
}))

vi.mock('~/main/core/stores', () => ({
  appDb: mockDb,
}))

import { TranslateService } from '~/features/translate/services'

describe('TranslateService', () => {
  let service: TranslateService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new TranslateService()
  })

  describe('initialize', () => {
    it('loads preferences from DB', async () => {
      mockDb.query.mockReturnValue([
        { key: 'autoTranslate', value: 'false' },
        { key: 'targetLanguage', value: '"fr"' },
      ])
      await service.initialize()
      const pref = service.getPreference()
      expect(pref.autoTranslate).toBe(false)
      expect(pref.targetLanguage).toBe('fr')
    })

    it('uses defaults when DB fails', async () => {
      mockDb.query.mockImplementation(() => {
        throw new Error('db error')
      })
      await service.initialize()
      const pref = service.getPreference()
      expect(pref.sourceLanguage).toBe('auto')
      expect(pref.targetLanguage).toBe('en')
      expect(pref.autoTranslate).toBe(true)
    })
  })

  describe('getPreference / savePreference', () => {
    it('returns default preference initially', () => {
      expect(service.getPreference()).toEqual({
        sourceLanguage: 'auto',
        targetLanguage: 'en',
        autoTranslate: true,
        alwaysTranslateDomains: [],
        neverTranslateDomains: [],
        neverTranslateLanguages: [],
      })
    })

    it('updates preference and persists', async () => {
      await service.savePreference({ targetLanguage: 'de', autoTranslate: false })
      const pref = service.getPreference()
      expect(pref.targetLanguage).toBe('de')
      expect(pref.autoTranslate).toBe(false)
      expect(mockDb.transaction).toHaveBeenCalled()
    })

    it('normalizes domain lists on save', async () => {
      await service.savePreference({
        alwaysTranslateDomains: ['Example.COM', 'www.test.org'],
        neverTranslateDomains: ['  BAD.DOMAIN  '],
      })
      const pref = service.getPreference()
      expect(pref.alwaysTranslateDomains).toEqual(['example.com', 'test.org'])
      expect(pref.neverTranslateDomains).toEqual(['bad.domain'])
    })

    it('normalizes language codes on save', async () => {
      await service.savePreference({ targetLanguage: 'EN-US' })
      expect(service.getPreference().targetLanguage).toBe('en-us')
    })

    it('deduplicates domain lists', async () => {
      await service.savePreference({ alwaysTranslateDomains: ['a.com', 'A.com', 'a.com'] })
      expect(service.getPreference().alwaysTranslateDomains).toEqual(['a.com'])
    })

    it('merges with existing preference', async () => {
      await service.savePreference({ sourceLanguage: 'es' })
      await service.savePreference({ targetLanguage: 'it' })
      const pref = service.getPreference()
      expect(pref.sourceLanguage).toBe('es')
      expect(pref.targetLanguage).toBe('it')
    })
  })

  describe('shouldAutoTranslate', () => {
    beforeEach(async () => {
      await service.savePreference({
        autoTranslate: true,
        alwaysTranslateDomains: ['trusted.com'],
        neverTranslateDomains: ['blocked.com'],
        neverTranslateLanguages: ['de'],
      })
    })

    it('returns true by default', () => {
      expect(service.shouldAutoTranslate('unknown.com')).toBe(true)
    })

    it('returns false when autoTranslate is off', async () => {
      await service.savePreference({ autoTranslate: false })
      expect(service.shouldAutoTranslate('any.com')).toBe(false)
    })

    it('returns false for never-translate domains', () => {
      expect(service.shouldAutoTranslate('blocked.com')).toBe(false)
    })

    it('returns false for never-translate languages', () => {
      expect(service.shouldAutoTranslate('any.com', 'de')).toBe(false)
    })

    it('returns true for always-translate domains', () => {
      expect(service.shouldAutoTranslate('trusted.com')).toBe(true)
    })

    it('normalizes domain before check', () => {
      expect(service.shouldAutoTranslate('www.BLOCKED.com')).toBe(false)
    })

    it('returns false when neverTranslate domain overrides always', async () => {
      await service.savePreference({
        alwaysTranslateDomains: ['conflict.com'],
        neverTranslateDomains: ['conflict.com'],
      })
      expect(service.shouldAutoTranslate('conflict.com')).toBe(false)
    })

    it('matches wildcard patterns in neverTranslateDomains', async () => {
      await service.savePreference({
        neverTranslateDomains: ['*.example.com'],
      })
      expect(service.shouldAutoTranslate('sub.example.com', undefined, 'https://sub.example.com/page')).toBe(false)
      expect(service.shouldAutoTranslate('deep.sub.example.com', undefined, 'https://deep.sub.example.com/')).toBe(
        false
      )
      expect(service.shouldAutoTranslate('other.com', undefined, 'https://other.com/page')).toBe(true)
    })

    it('matches wildcard patterns in alwaysTranslateDomains', async () => {
      await service.savePreference({
        alwaysTranslateDomains: ['trusted.org/*'],
      })
      expect(service.shouldAutoTranslate('trusted.org', undefined, 'https://trusted.org/about')).toBe(true)
      expect(service.shouldAutoTranslate('trusted.org', undefined, 'https://trusted.org')).toBe(true)
    })

    it('matches wildcard pattern without URL fallback', async () => {
      await service.savePreference({
        neverTranslateDomains: ['*.example.com/*'],
      })
      expect(service.shouldAutoTranslate('sub.example.com')).toBe(false)
      expect(service.shouldAutoTranslate('other.com')).toBe(true)
    })

    it('exact domain match still works without wildcard chars', async () => {
      await service.savePreference({
        neverTranslateDomains: ['exact.com'],
      })
      expect(service.shouldAutoTranslate('exact.com')).toBe(false)
      expect(service.shouldAutoTranslate('sub.exact.com')).toBe(true)
      expect(service.shouldAutoTranslate('exact.com.other')).toBe(true)
    })
  })

  describe('buildGoogleTranslateUrl', () => {
    it('builds translate URL', () => {
      const url = service.buildGoogleTranslateUrl({ targetUrl: 'https://example.com/page' })
      expect(url).toContain('translate.google.com/translate')
      expect(url).toContain('sl=auto')
      expect(url).toContain('tl=en')
      expect(url).toContain(encodeURIComponent('https://example.com/page'))
    })

    it('uses custom target language', () => {
      const url = service.buildGoogleTranslateUrl({ targetUrl: 'https://example.com', targetLanguage: 'fr' })
      expect(url).toContain('tl=fr')
    })
  })

  describe('scriptTranslatePrompt', () => {
    it('generates prompt banner script', () => {
      const script = service.scriptTranslatePrompt('fr')
      expect(script).toContain('__minus_translate_prompt_banner')
      expect(script).toContain('Translate this page from fr to en?')
      expect(script).toContain('translate.google.com/translate')
    })

    it('returns empty when source equals target', () => {
      const script = service.scriptTranslatePrompt('en')
      expect(script).toBe('')
    })

    it('uses "detected language" for auto', () => {
      const script = service.scriptTranslatePrompt('auto')
      expect(script).toContain('detected language')
    })
  })

  describe('scriptInjection', () => {
    it('generates selection popup script', () => {
      const result = { sourceLanguage: 'es', targetLanguage: 'en', translatedText: 'Hola mundo' }
      const script = service.scriptInjection('¡Hola mundo!', result)
      expect(script).toContain('__minus_translate_selection_popup')
      expect(script).toContain('es -> en')
      expect(script).toContain('Hola mundo')
    })
  })

  describe('detectLanguage', () => {
    it('returns unknown for empty text', async () => {
      const result = await service.detectLanguage('')
      expect(result.language).toBe('unknown')
    })

    it('returns unknown for whitespace', async () => {
      const result = await service.detectLanguage('   ')
      expect(result.language).toBe('unknown')
    })
  })

  describe('translateSelection', () => {
    it('returns null for empty text', async () => {
      const result = await service.translateSelection({ tabId: 't1', text: '' })
      expect(result).toBeNull()
    })
  })

  describe('applyManagerState', () => {
    it('replaces preference and persists', async () => {
      const pref = {
        sourceLanguage: 'auto',
        targetLanguage: 'ja',
        autoTranslate: false,
        alwaysTranslateDomains: [],
        neverTranslateDomains: [],
        neverTranslateLanguages: [],
      }
      await service.applyManagerState({ preference: pref })
      expect(service.getPreference().targetLanguage).toBe('ja')
      expect(service.getPreference().autoTranslate).toBe(false)
      expect(mockDb.transaction).toHaveBeenCalled()
    })
  })
})
