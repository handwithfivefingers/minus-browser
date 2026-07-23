import { useEffect, useRef } from 'react'

import { ITab } from '~/shared/types'

export const useTranslation = (tab?: ITab) => {
  const latestSelectionRef = useRef<string>('')

  const onTranslateLanguageDetected = async (payload: { tabId?: string; language?: string; url?: string }) => {
    if (!payload || payload.tabId !== tab?.id) return
    if (!payload.language) return
    try {
      const pageUrl = payload.url || tab?.url || ''
      const domain = (() => {
        try {
          return new URL(pageUrl).hostname
        } catch {
          return ''
        }
      })()
      const shouldAuto = await window.api.INVOKE<boolean>('TRANSLATE_SHOULD_AUTO', {
        domain,
        language: payload.language,
        url: pageUrl,
      })
      if (!shouldAuto) return
      await window.api.INVOKE('TRANSLATE_SHOW_PROMPT', { language: payload.language })
    } catch (error) {
      console.error('onTranslateLanguageDetected error', error)
    }
  }

  const onTranslateSelectionAvailable = (payload: { tabId?: string; text?: string }) => {
    if (payload?.tabId && payload.tabId !== tab?.id) return
    latestSelectionRef.current = String(payload.text || '').trim()
    onTranslateSelection()
  }

  const onTranslateSelection = async () => {
    try {
      const selectedText = latestSelectionRef.current?.trim() || undefined
      await window.api.INVOKE('TRANSLATE_SELECTION', {
        tabId: tab?.id,
        text: selectedText,
      })
    } catch (error) {
      console.error('onTranslateSelection error', error)
    }
  }

  const onOpenTranslateManager = async () => {
    try {
      await window.api.INVOKE('TRANSLATE_OPEN_MANAGER', { tabId: tab?.id })
    } catch (error) {
      console.error('onOpenTranslateManager error', error)
    }
  }
  const onTranslatePage = async () => {
    try {
      await window.api.INVOKE('TRANSLATE_PAGE', { tabId: tab?.id })
    } catch (error) {
      console.error('onTranslatePage error', error)
    }
  }
  useEffect(() => {
    window.api.LISTENER('TRANSLATE_LANGUAGE_DETECTED', onTranslateLanguageDetected)
    window.api.LISTENER('TRANSLATE_SELECTION_AVAILABLE', onTranslateSelectionAvailable)
  }, [tab?.id])

  return {
    onOpenTranslateManager,
    onTranslatePage,
  }
}
