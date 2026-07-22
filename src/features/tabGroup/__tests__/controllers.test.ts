import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockDb, mockCacheSystem } = vi.hoisted(() => ({
  mockDb: {
    run: vi.fn(),
    get: vi.fn(),
    query: vi.fn(),
    transaction: vi.fn((fn: () => void) => fn()),
  },
  mockCacheSystem: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('~/main/core/stores', () => ({
  appDb: mockDb,
}))

vi.mock('~/features/cacheSystem', () => ({
  cacheSystem: mockCacheSystem,
}))

import { TabGroupController } from '~/features/tabGroup/controllers'

describe('TabGroupController', () => {
  let controller: TabGroupController

  beforeEach(() => {
    vi.clearAllMocks()
    controller = new TabGroupController()
    mockDb.query.mockReturnValue([])
  })

  describe('initialize', () => {
    it('loads groups from cache', async () => {
      const groups = [
        {
          id: 'g1',
          name: 'Work',
          color: '#6366f1',
          tabIds: ['t1', 't2'],
          hidden: false,
          collapsed: false,
          createdAt: 100,
          updatedAt: 200,
        },
      ]
      mockCacheSystem.get.mockResolvedValue({ tabGroups: groups })
      await controller.initialize()
      expect(controller.getGroups()).toHaveLength(1)
      expect(controller.getGroups()[0].name).toBe('Work')
    })

    it('handles empty cache', async () => {
      mockCacheSystem.get.mockResolvedValue(undefined)
      await controller.initialize()
      expect(controller.getGroups()).toHaveLength(0)
    })
  })

  describe('createGroup', () => {
    it('creates a group with defaults', async () => {
      const group = await controller.createGroup('Test')
      expect(group.name).toBe('Test')
      expect(group.color).toBe('#6366f1')
      expect(group.tabIds).toEqual([])
      expect(group.hidden).toBe(false)
      expect(group.collapsed).toBe(false)
      expect(group.id).toBeDefined()
    })

    it('creates a group with custom color and tabs', async () => {
      const group = await controller.createGroup('Dev', '#ff0000', ['t1'])
      expect(group.color).toBe('#ff0000')
      expect(group.tabIds).toEqual(['t1'])
    })

    it('syncs cache after creation', async () => {
      await controller.createGroup('Test')
      expect(mockCacheSystem.set).toHaveBeenCalledWith(
        'tabGroups',
        expect.objectContaining({
          tabGroups: expect.arrayContaining([expect.objectContaining({ name: 'Test' })]),
        })
      )
    })
  })

  describe('deleteGroup', () => {
    it('deletes an existing group', async () => {
      const group = await controller.createGroup('ToDelete')
      expect(controller.getGroups()).toHaveLength(1)
      await controller.deleteGroup(group.id)
      expect(controller.getGroups()).toHaveLength(0)
    })
  })

  describe('renameGroup', () => {
    it('renames a group', async () => {
      const group = await controller.createGroup('Old')
      await controller.renameGroup(group.id, 'New')
      const updated = controller.getGroups()[0]
      expect(updated.name).toBe('New')
      expect(updated.updatedAt).toBeGreaterThanOrEqual(group.updatedAt)
    })

    it('does nothing for non-existent group', async () => {
      await expect(controller.renameGroup('nonexistent', 'New')).resolves.toBeUndefined()
    })
  })

  describe('setGroupColor', () => {
    it('changes group color', async () => {
      const group = await controller.createGroup('G')
      await controller.setGroupColor(group.id, '#00ff00')
      expect(controller.getGroups()[0].color).toBe('#00ff00')
    })
  })

  describe('addTabToGroup / removeTabFromGroup', () => {
    it('adds a tab to a group', async () => {
      const group = await controller.createGroup('G')
      await controller.addTabToGroup(group.id, 'tab-a')
      expect(controller.getGroupTabIds(group.id)).toEqual(['tab-a'])
    })

    it('does not duplicate tabs', async () => {
      const group = await controller.createGroup('G')
      await controller.addTabToGroup(group.id, 'tab-a')
      await controller.addTabToGroup(group.id, 'tab-a')
      expect(controller.getGroupTabIds(group.id)).toEqual(['tab-a'])
    })

    it('removes a tab from group and deletes empty group', async () => {
      const group = await controller.createGroup('G')
      await controller.addTabToGroup(group.id, 'tab-a')
      await controller.removeTabFromGroup(group.id, 'tab-a')
      expect(controller.getGroups()).toHaveLength(0)
    })

    it('finds group by tab ID', async () => {
      const group = await controller.createGroup('G')
      await controller.addTabToGroup(group.id, 'tab-x')
      const found = controller.getGroupByTabId('tab-x')
      expect(found?.id).toBe(group.id)
    })

    it('returns undefined for tab not in any group', () => {
      expect(controller.getGroupByTabId('nonexistent')).toBeUndefined()
    })

    it('removes tab via removeTabFromGroupByTabId', async () => {
      const group = await controller.createGroup('G')
      await controller.addTabToGroup(group.id, 'tab-y')
      await controller.removeTabFromGroupByTabId('tab-y')
      expect(controller.getGroups()).toHaveLength(0)
    })
  })

  describe('hide / unhide', () => {
    it('hides and unhides a group', async () => {
      const group = await controller.createGroup('G')
      await controller.hideGroup(group.id)
      expect(controller.getGroups()[0].hidden).toBe(true)
      await controller.unhideGroup(group.id)
      expect(controller.getGroups()[0].hidden).toBe(false)
    })
  })

  describe('toggleCollapse', () => {
    it('toggles collapsed state', async () => {
      const group = await controller.createGroup('G')
      expect(group.collapsed).toBe(false)
      await controller.toggleCollapse(group.id)
      expect(controller.getGroups()[0].collapsed).toBe(true)
      await controller.toggleCollapse(group.id)
      expect(controller.getGroups()[0].collapsed).toBe(false)
    })
  })

  describe('reorderTabsInGroup', () => {
    it('reorders tabs within group', async () => {
      const group = await controller.createGroup('G', '#000', ['a', 'b', 'c'])
      await controller.reorderTabsInGroup(group.id, ['c', 'a', 'b'])
      expect(controller.getGroupTabIds(group.id)).toEqual(['c', 'a', 'b'])
    })

    it('ignores tab IDs not in the group', async () => {
      const group = await controller.createGroup('G', '#000', ['a', 'b'])
      await controller.reorderTabsInGroup(group.id, ['c', 'a', 'b', 'd'])
      expect(controller.getGroupTabIds(group.id)).toEqual(['a', 'b'])
    })
  })

  describe('destroy', () => {
    it('clears all groups', async () => {
      await controller.createGroup('G1')
      await controller.createGroup('G2')
      controller.destroy()
      expect(controller.getGroups()).toHaveLength(0)
    })
  })

  describe('syncCache', () => {
    it('persists to DB via transaction', async () => {
      await controller.createGroup('G')
      expect(mockDb.transaction).toHaveBeenCalled()
      expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM tab_groups')
    })
  })

  describe('onChanged callback', () => {
    it('calls onChanged after mutations', async () => {
      const onChanged = vi.fn()
      controller.onChanged = onChanged
      await controller.createGroup('G')
      expect(onChanged).toHaveBeenCalledOnce()
    })
  })
})
