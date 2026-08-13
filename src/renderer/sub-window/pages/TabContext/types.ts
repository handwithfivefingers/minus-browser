export const GROUP_COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4']

export interface IGroup {
  id: string
  name: string
  color: string
  tabIds: string[]
}

export type View = 'context-menu' | 'create-group' | null

export interface ContextPayload {
  tabId?: string
  groupId?: string
  currentGroupId?: string | null
  groups?: IGroup[]
  x: number
  y: number
  editGroup?: { id: string; name: string; color: string }
}
