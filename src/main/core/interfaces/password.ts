export interface IPasswordItem {
  id: string
  site: string
  username: string
  password: string
  notes?: string
  createdAt: number
  updatedAt: number
}

export interface IPasswordVaultPayload {
  cipherText: string
  isEncrypted: boolean
}
