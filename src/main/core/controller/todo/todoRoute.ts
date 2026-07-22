import { IPC_INVOKE_CHANNEL } from '~/shared/constants/ipc'

import { TodoController } from './todoController'

const todoController = new TodoController()
export { todoController }

export const TodoRoute: Record<string, (...args: any[]) => any> = {
  [IPC_INVOKE_CHANNEL.TODO_GET_ALL]: () => todoController.getAll(),
  [IPC_INVOKE_CHANNEL.TODO_CREATE]: (data: { label: string; description: string }) =>
    todoController.create(data.label, data.description),
  [IPC_INVOKE_CHANNEL.TODO_UPDATE]: (data: { id: string; label?: string; description?: string; checked?: boolean }) =>
    todoController.update(data.id, data),
  [IPC_INVOKE_CHANNEL.TODO_DELETE]: (id: string) => todoController.delete(id),
}
