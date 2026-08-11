import { create } from 'zustand'

export interface IVaultPendingCredential {
  hostname: string
  username: string
  password: string
  isUpdate: boolean
  existingId?: string
}

interface IVaultCaptureState {
  pending: IVaultPendingCredential | null
  show: (pending: IVaultPendingCredential) => void
  close: () => void
}

export const useVaultCaptureStore = create<IVaultCaptureState>((set) => ({
  pending: null,
  show: (pending) => set({ pending }),
  close: () => set({ pending: null }),
}))
