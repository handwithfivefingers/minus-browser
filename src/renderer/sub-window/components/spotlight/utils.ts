const normalizeHref = (value: string): string | null => {
  const trimmed = value.trim()
  if (!trimmed) return null
  const candidates = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? [trimmed] : [`https://${trimmed}`]
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate)
      const pathname = url.pathname && url.pathname !== '/' ? url.pathname : ''
      return `${url.origin}${pathname}${url.search}${url.hash}`
    } catch (error) {
      /* ignore */
    }
  }
  return null
}

export const isSameHref = (a: string, b: string): boolean => {
  const normalized = normalizeHref(a)
  const target = normalizeHref(b)
  return !!normalized && !!target && normalized === target
}

export const normalizeForDedupe = (url: string): string => normalizeHref(url) || url

export const navigateCurrentTab = (url: string, activeTabId: string | undefined, close: () => void) => {
  if (activeTabId) {
    window.api.EMIT('VIEW_CHANGE_URL', { id: activeTabId, url })
  } else {
    window.api.INVOKE<{ id: string }>('CREATE_TAB', { url })
  }
  close()
}

export const openInNewTab = (url: string, close: () => void) => {
  const params = url ? { url } : undefined
  Promise.resolve(window.api.INVOKE<{ id: string }>('CREATE_TAB', params)).finally(close)
}
