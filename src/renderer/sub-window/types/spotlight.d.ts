export interface IHistoryEntry {
  id: string
  url: string
  title: string
  favicon: string
  timestamp: number
  visitCount: number
}

export interface SpotlightProps {
  query: string
  activeTabId?: string
}

export type SpotlightAction =
  | {
      id: string
      kind: 'tab'
      label: string
      description: string
      onSelect: () => void
      score: number
    }
  | {
      id: string
      kind: 'history'
      label: string
      description: string
      onSelect: () => void
      score: number
    }
  | {
      id: string
      kind: 'search'
      label: string
      description: string
      onSelect: () => void
      score: number
    }
  | {
      id: string
      kind: 'create'
      label: string
      description: string
      onSelect: () => void
      score: number
    }
