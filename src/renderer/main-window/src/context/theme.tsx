import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { IPC_EMIT_CHANNEL } from '~/shared/constants/ipc'

import { useMinusThemeStore } from '../stores/useMinusTheme'

type ThemeMode = 'light' | 'dark' | 'auto'
type ResolvedTheme = 'light' | 'dark'

interface IThemeContext {
  mode: ThemeMode
  resolved: ResolvedTheme
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<IThemeContext>({
  mode: 'auto',
  resolved: 'light',
  setMode: () => {},
})

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const storeMode = useMinusThemeStore((s) => s.mode) as ThemeMode
  const setStoreMode = useMinusThemeStore((s) => s.setMode)

  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const resolved: ResolvedTheme = storeMode === 'auto' ? (systemDark ? 'dark' : 'light') : storeMode

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }, [resolved])

  const isFirstMount = useRef(true)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }
    window.api?.EMIT?.(IPC_EMIT_CHANNEL.THEME_MODE_CHANGED, { mode: storeMode })
  }, [storeMode])

  const value = useMemo(
    () => ({
      mode: storeMode,
      resolved,
      setMode: (mode: ThemeMode) => setStoreMode(mode),
    }),
    [storeMode, resolved, setStoreMode]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
