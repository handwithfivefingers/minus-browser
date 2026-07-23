import { describe, it, expect, beforeEach } from 'vitest'

import { useTabGroupStore } from '~/renderer/main-window/src/stores/useTabGroupStore'

const makeGroup = (id: string, name: string) => ({
  id,
  name,
  color: '#ff0000',
  tabIds: [],
  hidden: false,
  collapsed: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

describe('useTabGroupStore', () => {
  beforeEach(() => {
    useTabGroupStore.setState({ groups: [] })
  })

  it('sets groups', () => {
    const groups = [makeGroup('g1', 'Group 1'), makeGroup('g2', 'Group 2')]
    useTabGroupStore.getState().setGroups(groups)
    expect(useTabGroupStore.getState().groups).toHaveLength(2)
  })

  it('adds a group', () => {
    useTabGroupStore.getState().addGroup(makeGroup('g1', 'New Group'))
    expect(useTabGroupStore.getState().groups).toHaveLength(1)
    expect(useTabGroupStore.getState().groups[0].name).toBe('New Group')
  })

  it('updates a group', () => {
    useTabGroupStore.getState().addGroup(makeGroup('g1', 'Original'))
    useTabGroupStore.getState().updateGroup('g1', { name: 'Updated', color: '#00ff00' })
    const g = useTabGroupStore.getState().groups[0]
    expect(g.name).toBe('Updated')
    expect(g.color).toBe('#00ff00')
  })

  it('removes a group', () => {
    useTabGroupStore.getState().addGroup(makeGroup('g1', 'Remove me'))
    useTabGroupStore.getState().removeGroup('g1')
    expect(useTabGroupStore.getState().groups).toHaveLength(0)
  })
})
