// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    query: vi.fn(),
    get: vi.fn(),
    run: vi.fn(),
  },
}))

vi.mock('~/main/core/stores/database', () => ({
  appDb: mockDb,
}))

vi.mock('~/main/core/stores', async (importOriginal) => {
  const original = await importOriginal()
  return { ...(original as any), appDb: mockDb }
})

import { TodoController } from '../todoController'

describe('TodoController', () => {
  let todo: TodoController

  beforeEach(() => {
    vi.clearAllMocks()
    todo = new TodoController()
  })

  it('getAll queries all todo items', () => {
    mockDb.query.mockReturnValue([])
    todo.getAll()
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT id, label, description, checked, created_at, updated_at FROM todo_items')
    )
  })

  it('create inserts a new todo item', () => {
    mockDb.run.mockImplementation(() => {
      return
    })
    const item = todo.create('Test Task', 'A description')
    expect(item.label).toBe('Test Task')
    expect(item.description).toBe('A description')
    expect(item.checked).toBe(false)
    expect(item.id).toBeTruthy()
    expect(mockDb.run).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO todo_items'), [
      item.id,
      'Test Task',
      'A description',
      0,
      item.created_at,
      item.updated_at,
    ])
  })

  it('create returns item with timestamps', () => {
    const item = todo.create('Task', 'Desc')
    expect(item.created_at).toBeGreaterThan(0)
    expect(item.updated_at).toBeGreaterThan(0)
  })

  it('update returns null for non-existent item', () => {
    mockDb.get.mockReturnValue(undefined)
    const result = todo.update('nonexistent', { label: 'New' })
    expect(result).toBeNull()
  })

  it('update modifies an existing item', () => {
    const existing = {
      id: 'todo-1',
      label: 'Old',
      description: 'Old desc',
      checked: false,
      created_at: 1000,
      updated_at: 1000,
    }
    mockDb.get.mockReturnValue(existing)
    const result = todo.update('todo-1', { label: 'New Label', checked: true })
    expect(result!.label).toBe('New Label')
    expect(result!.checked).toBe(true)
    expect(result!.description).toBe('Old desc')
    expect(mockDb.run).toHaveBeenCalledWith(expect.stringContaining('UPDATE todo_items'), [
      'New Label',
      'Old desc',
      1,
      expect.any(Number),
      'todo-1',
    ])
  })

  it('delete removes an item by id', () => {
    todo.delete('todo-1')
    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM todo_items WHERE id = ?', ['todo-1'])
  })
})
