import { describe, it, expect, beforeEach, vi } from 'vitest'

import { useUpdateStore } from '~/renderer/main-window/src/stores/useUpdateStore'

describe('useUpdateStore', () => {
  beforeEach(() => {
    useUpdateStore.setState({ status: { status: 'idle' } })
  })

  it('starts with idle status', () => {
    expect(useUpdateStore.getState().status.status).toBe('idle')
  })

  it('sets checking status', () => {
    useUpdateStore.getState().setStatus({ status: 'checking' })
    expect(useUpdateStore.getState().status.status).toBe('checking')
  })

  it('sets downloaded status with info', () => {
    useUpdateStore.getState().setStatus({
      status: 'downloaded',
      info: { releaseNotes: '', releaseName: 'v2.0.0', releaseDate: new Date(), updateURL: '' },
    })
    const s = useUpdateStore.getState().status
    expect(s.status).toBe('downloaded')
  })

  it('sets error status', () => {
    useUpdateStore.getState().setStatus({ status: 'error', info: 'Network error' })
    expect(useUpdateStore.getState().status.status).toBe('error')
  })

  it('checkForUpdate calls window.api.INVOKE', () => {
    window.api.INVOKE = vi.fn()
    useUpdateStore.getState().checkForUpdate()
    expect(window.api.INVOKE).toHaveBeenCalledWith('CHECK_FOR_UPDATE')
  })

  it('quitAndInstall calls window.api.INVOKE', () => {
    window.api.INVOKE = vi.fn()
    useUpdateStore.getState().quitAndInstall()
    expect(window.api.INVOKE).toHaveBeenCalledWith('QUIT_AND_INSTALL_UPDATE')
  })
})
