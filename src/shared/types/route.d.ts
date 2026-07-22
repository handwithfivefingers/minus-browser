import { IPasswordItem } from './password'

interface VaultUpdateParams {
  id: string
  patch: Partial<Pick<IPasswordItem, 'site' | 'username' | 'password' | 'notes'>>
}
