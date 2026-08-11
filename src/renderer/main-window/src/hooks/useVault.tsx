import { useEffect, useRef } from 'react'

import { Tab } from '../interfaces'
import { useVaultCaptureStore } from '../stores/useVaultCaptureStore'

interface IDetectedCredentialPayload {
  tabId?: string
  hostname?: string
  username?: string
  password?: string
}
interface IPasswordVaultItem {
  id: string
  site: string
  username: string
  password: string
  notes?: string
}

export const useVault = (tab?: Tab) => {
  const handledCredentialRef = useRef<Set<string>>(new Set())

  const onCredentialDetected = async (payload: IDetectedCredentialPayload) => {
    try {
      if (!payload || payload.tabId !== tab?.id) return
      const hostname = (payload.hostname || '').toLowerCase()
      if (!hostname || !payload.password?.trim()) return
      const username = (payload.username || '').trim() || 'unknown'
      const cacheKey = `${payload.tabId}:${hostname}:${username}:${payload.password}`
      if (handledCredentialRef.current.has(cacheKey)) return
      handledCredentialRef.current.add(cacheKey)

      const existingVault = await window.api.INVOKE<IPasswordVaultItem[]>('VAULT_LIST')
      const existing = existingVault.find(
        (item) =>
          item.site.toLowerCase() === hostname && item.username.trim().toLowerCase() === username.toLowerCase()
      )
      if (existing && existing.password === payload.password) return

      useVaultCaptureStore.getState().show({
        hostname,
        username,
        password: payload.password,
        isUpdate: !!existing,
        existingId: existing?.id,
      })
    } catch (error) {
      console.error('onCredentialDetected error', error)
    }
  }

  const onOpenVaultManager = async () => {
    try {
      await window.api.INVOKE('VAULT_OPEN_MANAGER', { tabId: tab?.id })
    } catch (error) {
      console.error('onOpenVaultManager error', error)
    }
  }

  useEffect(() => {
    window.api.LISTENER('VAULT_CREDENTIAL_DETECTED', onCredentialDetected)
  }, [tab?.id])
  return {
    onOpenVaultManager,
  }
}