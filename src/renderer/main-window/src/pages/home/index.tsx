import { IconBell, IconBellFilled, IconPlus, IconSquare, IconSquareCheck, IconTrash } from '@tabler/icons-react'
import clsx from 'clsx'
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from 'react'

import { useWebNotificationStore } from '~/shared/store/useNotificationStore'

import { GravityStarsBackground } from '../../components/gravityStarsBackground'

// @ts-ignore
import styles from './styles.module.css'

interface ITodoItem {
  label: string
  description: string
  checked: boolean
  id: string
}

const Home = () => {
  return (
    <div className="relative h-full w-full bg-slate-100 px-2 dark:bg-slate-950">
      <TodoHome />
    </div>
  )
}

const DATE_OUTPUT = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const TodoHome = () => {
  const hourRef = useRef<HTMLSpanElement | null>(null)
  const minRef = useRef<HTMLSpanElement | null>(null)
  const [todos, setTodos] = useState<ITodoItem[]>([])
  const [isPending, startTransition] = useTransition()

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useWebNotificationStore()
  useLayoutEffect(() => {
    let interval: NodeJS.Timeout | null = null
    interval = setInterval(() => {
      const [hours, minutes] = new Date().toLocaleTimeString().split(':')
      if (!hourRef.current || !minRef.current) return
      hourRef.current.innerHTML = hours
      minRef.current.innerHTML = minutes
    })

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [])
  const loadTodos = async () => {
    const data = await window.api.INVOKE<ITodoItem[]>('TODO_GET_ALL')
    setTodos(data || [])
  }

  useEffect(() => {
    loadTodos()
  }, [])

  const addNewTodo = async () => {
    const newTodo = await window.api.INVOKE<ITodoItem>('TODO_CREATE', {
      label: 'new todo',
      description: 'new description',
    })
    if (newTodo) {
      startTransition(() => {
        setTodos((prev) => [...prev, newTodo])
      })
    }
  }

  const onSave = async (todoItem: ITodoItem) => {
    const updated = await window.api.INVOKE<ITodoItem | null>('TODO_UPDATE', {
      id: todoItem.id,
      label: todoItem.label,
      description: todoItem.description,
      checked: todoItem.checked,
    })
    if (updated) {
      startTransition(() => {
        setTodos((prev) => prev.map((item) => (item.id === todoItem.id ? updated : item)))
      })
    }
  }

  const onDelete = async (todoItem: ITodoItem) => {
    await window.api.INVOKE('TODO_DELETE', todoItem.id)
    startTransition(() => {
      setTodos((prev) => prev.filter((item) => item.id !== todoItem.id))
    })
  }

  const recentNotifications = notifications.slice(0, 5)
  return (
    <div className="items-start-safe flex h-full w-full flex-col justify-center gap-8 py-20">
      <GravityStarsBackground className="absolute top-0 left-0 h-full w-full text-indigo-500" />
      <div className={clsx('flex w-full justify-center gap-8', styles.fadeSection)} style={{ animationDelay: '0.05s' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-1 shrink-0 gap-2">
            <span className="text-3xl font-medium text-slate-900 dark:text-white">
              {DATE_OUTPUT[new Date().getDay()]}
            </span>
            <span className="text-3xl font-medium text-slate-900 dark:text-white">
              {new Date().getDate()}/{new Date().getMonth()}/{new Date().getFullYear()}
            </span>
          </div>
          <div className={clsx('flex-1 shrink-0', styles.clockFloat)}>
            <span ref={hourRef} className="text-8xl font-medium text-slate-900 dark:text-white" />
            <span className="text-8xl font-medium text-slate-900 dark:text-white">:</span>
            <span ref={minRef} className="text-8xl font-medium text-slate-900 dark:text-white" />
          </div>
        </div>
      </div>

      <div
        className={clsx('mx-auto flex w-full max-w-3xl flex-1 gap-4 overflow-hidden', styles.fadeSection)}
        style={{ animationDelay: '0.15s' }}
      >
        <div className="flex h-full flex-1 flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="w-full text-lg font-semibold text-slate-900 dark:text-white">Todos</h2>
          </div>
          <div className="scrollbar flex flex-col gap-2 overflow-x-hidden overflow-y-auto">
            {todos?.map((item) => {
              return <TodoItem {...item} key={item.id} onSave={onSave} onDelete={() => onDelete(item)} />
            })}
          </div>
          <button
            type="button"
            className="sticky bottom-0 mx-auto flex cursor-pointer items-center gap-1 rounded bg-indigo-500 p-2 text-sm text-white"
            onClick={addNewTodo}
            disabled={isPending}
          >
            <IconPlus />
            <span>New Todo</span>
          </button>
        </div>

        <div
          className={clsx('flex h-full w-80 flex-col gap-2', styles.fadeSection)}
          style={{ animationDelay: '0.25s' }}
        >
          <div className="flex cursor-pointer items-center gap-2 text-slate-900 dark:text-white">
            {unreadCount > 0 ? <IconBellFilled size={20} /> : <IconBell size={20} />}
            <h2 className="text-lg font-semibold ">Notifications</h2>
            {unreadCount > 0 && (
              <span className="flex min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="cursor-pointer self-start text-xs text-indigo-400 hover:text-indigo-300"
            >
              Mark all as read
            </button>
          )}

          <div className="scrollbar flex max-h-68.75 flex-col gap-2 overflow-x-hidden overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <p className="text-sm text-slate-400">No notifications</p>
            ) : (
              recentNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    markAsRead(n.id)
                    window.api.EMIT('OPEN_TAB_BY_ID', { id: n.tabId })
                  }}
                  className={clsx(
                    'flex cursor-pointer gap-2 rounded-md p-2 transition-colors',
                    n.read ? 'bg-slate-700/50' : 'bg-indigo-500/20'
                  )}
                  aria-hidden
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-400" />}
                      <span className={clsx('truncate text-sm', n.read ? 'text-slate-300' : 'font-medium text-white')}>
                        {n.tabTitle}
                      </span>
                    </div>
                    {n.body && <p className="mt-0.5 truncate text-xs text-slate-400">{n.body}</p>}
                    <p className="mt-0.5 text-[10px] text-slate-500">{new Date(n.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const TodoItem = ({
  onSave,
  onDelete,
  ...props
}: ITodoItem & { onSave: (todo: ITodoItem) => void; onDelete: () => void }) => {
  const [todo, setTodo] = useState(props)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined = undefined
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      onSave(todo)
    }, 750)
    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [todo])
  return (
    <div className="group relative flex gap-4 rounded-md border border-slate-500/20 bg-linear-to-br from-slate-950 to-slate-500 p-2 px-4 backdrop-blur-md dark:from-white/10 dark:via-slate-700/10 dark:to-white/5">
      <span
        className="cursor-pointer text-indigo-500"
        onClick={() => setTodo((prev) => ({ ...prev, checked: !prev.checked }))}
        aria-hidden
      >
        {!todo.checked ? <IconSquare /> : <IconSquareCheck />}
      </span>
      <div className="flex w-full flex-col gap-1">
        <input
          className="rounded-sm px-2 text-base font-normal text-white/80 capitalize ring-1 ring-transparent outline-0 focus:ring-slate-500"
          value={todo.label}
          onChange={(e) => setTodo((prev) => ({ ...prev, label: e.target.value }))}
        />
        <textarea
          className="scrollbar rounded-sm px-2 text-sm text-white/80 ring-1 ring-transparent outline-0 focus:ring-slate-500"
          value={todo.description}
          onChange={(e) => setTodo((prev) => ({ ...prev, description: e.target.value }))}
        />
      </div>

      <button
        type="button"
        onClick={onDelete}
        className="invisible absolute top-1/2 right-0.5 z-1 -translate-y-1/2 cursor-pointer rounded border border-slate-300 bg-white p-1 text-red-700 opacity-0 group-hover:visible group-hover:opacity-100"
      >
        <IconTrash />
      </button>
    </div>
  )
}

export default Home
