import { create } from 'zustand'

import type { UpdateStatusEvent } from '~/features/autoUpdate/types'
import { IPC_INVOKE_CHANNEL, IPC_RENDERER_EVENT } from '~/shared/constants/ipc'

export interface IUpdateStore {
  status: UpdateStatusEvent
  setStatus: (status: UpdateStatusEvent) => void
  checkForUpdate: () => void
  quitAndInstall: () => void
}

const useUpdateStore = create<IUpdateStore>((set) => ({
  status: { status: 'idle' },
  setStatus: (status: UpdateStatusEvent) => set({ status }),
  checkForUpdate: () => {
    window.api.INVOKE(IPC_INVOKE_CHANNEL.CHECK_FOR_UPDATE)
  },
  quitAndInstall: () => {
    window.api.INVOKE(IPC_INVOKE_CHANNEL.QUIT_AND_INSTALL_UPDATE)
  },
}))

export function setupUpdateListener() {
  window.api.LISTENER(IPC_RENDERER_EVENT.UPDATE_STATUS, (payload: UpdateStatusEvent) => {
    useUpdateStore.getState().setStatus(payload)
  })
}

export { useUpdateStore }
