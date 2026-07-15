import { IconBell, IconBellFilled, IconPlus, IconSquare, IconSquareCheck, IconTrash } from "@tabler/icons-react";
import clsx from "clsx";
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { useWebNotificationStore } from "~/shared/store/useNotificationStore";

interface ITodoItem {
  label: string;
  description: string;
  checked: boolean;
  id: string;
}

const Home = () => {
  return (
    <div className="relative px-2 bg-slate-800 h-full w-full">
      <TodoHome />
    </div>
  );
};

const DATE_OUTPUT = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TodoHome = () => {
  const hourRef = useRef<HTMLSpanElement | null>(null);
  const minRef = useRef<HTMLSpanElement | null>(null);
  const [todos, setTodos] = useState<ITodoItem[]>([]);
  const [isPending, startTransition] = useTransition();

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useWebNotificationStore();
  useLayoutEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    interval = setInterval(() => {
      const [hours, minutes] = new Date().toLocaleTimeString().split(":");
      if (!hourRef.current || !minRef.current) return;
      hourRef.current.innerHTML = hours;
      minRef.current.innerHTML = minutes;
    });

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    const data = await window.api.INVOKE<ITodoItem[]>("TODO_GET_ALL");
    setTodos(data || []);
  };

  const addNewTodo = async () => {
    const newTodo = await window.api.INVOKE<ITodoItem>("TODO_CREATE", {
      label: "new todo",
      description: "new description",
    });
    if (newTodo) {
      startTransition(() => {
        setTodos((prev) => [...prev, newTodo]);
      });
    }
  };

  const onSave = async (todoItem: ITodoItem) => {
    const updated = await window.api.INVOKE<ITodoItem | null>("TODO_UPDATE", {
      id: todoItem.id,
      label: todoItem.label,
      description: todoItem.description,
      checked: todoItem.checked,
    });
    if (updated) {
      startTransition(() => {
        setTodos((prev) => prev.map((item) => (item.id === todoItem.id ? updated : item)));
      });
    }
  };

  const onDelete = async (todoItem: ITodoItem) => {
    await window.api.INVOKE("TODO_DELETE", todoItem.id);
    startTransition(() => {
      setTodos((prev) => prev.filter((item) => item.id !== todoItem.id));
    });
  };

  const recentNotifications = notifications.slice(0, 5);
  console.log("recentNotifications", recentNotifications);
  return (
    <div className="flex justify-center h-full items-start-safe py-20 flex-col gap-8 w-full">
      <div className="flex justify-center w-full gap-8">
        <div className="flex flex-col items-center gap-4">
          <div className="flex-1 shrink-0 gap-2 flex">
            <span className="font-medium text-3xl text-white">{DATE_OUTPUT[new Date().getDay()]}</span>
            <span className="font-medium text-3xl text-white">
              {new Date().getDate()}/{new Date().getMonth()}/{new Date().getFullYear()}
            </span>
          </div>
          <div className="flex-1 shrink-0">
            <span ref={hourRef} className="font-medium text-8xl text-white" />
            <span className="font-medium text-8xl text-white">:</span>
            <span ref={minRef} className="font-medium text-8xl text-white" />
          </div>
        </div>
      </div>

      <div className="flex gap-4 w-full max-w-3xl mx-auto flex-1 overflow-hidden">
        <div className="flex-1 h-full flex gap-2 flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white w-full">Todos</h2>
          </div>
          <div className="flex gap-2 flex-col overflow-x-hidden overflow-y-auto scrollbar">
            {todos?.map((item) => {
              return <TodoItem {...item} key={item.id} onSave={onSave} onDelete={() => onDelete(item)} />;
            })}
          </div>
          <button
            type="button"
            className="text-white cursor-pointer sticky bottom-0 flex gap-1 items-center mx-auto bg-indigo-500 rounded p-2 text-sm"
            onClick={addNewTodo}
            disabled={isPending}
          >
            <IconPlus />
            <span>New Todo</span>
          </button>
        </div>

        <div className="w-80 h-full flex gap-2 flex-col">
          <div className="flex items-center gap-2 text-white cursor-pointer">
            {unreadCount > 0 ? <IconBellFilled size={20} /> : <IconBell size={20} />}
            <h2 className="text-lg font-semibold ">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-4.5 flex items-center justify-center px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer self-start"
            >
              Mark all as read
            </button>
          )}

          <div className="flex gap-2 flex-col max-h-68.75 overflow-x-hidden overflow-y-auto scrollbar">
            {recentNotifications.length === 0 ? (
              <p className="text-sm text-slate-400">No notifications</p>
            ) : (
              recentNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    markAsRead(n.id);
                    window.api.EMIT("OPEN_TAB_BY_ID", { id: n.tabId });
                  }}
                  className={clsx(
                    "flex gap-2 p-2 rounded-md cursor-pointer transition-colors",
                    n.read ? "bg-slate-700/50" : "bg-indigo-500/20",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      {!n.read && <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />}
                      <span className={clsx("text-sm truncate", n.read ? "text-slate-300" : "text-white font-medium")}>
                        {n.tabTitle}
                      </span>
                    </div>
                    {n.body && <p className="text-xs text-slate-400 truncate mt-0.5">{n.body}</p>}
                    <p className="text-[10px] text-slate-500 mt-0.5">{new Date(n.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TodoItem = ({
  onSave,
  onDelete,
  ...props
}: ITodoItem & { onSave: (todo: ITodoItem) => void; onDelete: () => void }) => {
  const [todo, setTodo] = useState(props);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined = undefined;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      onSave(todo);
    }, 750);
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [todo]);
  return (
    <div className="flex bg-linear-to-br from-white/10 via-slate-700/10 to-white/5 backdrop-blur-md p-2 px-4 gap-4 rounded-md group relative border border-slate-500/20">
      <span
        className="cursor-pointer text-indigo-500"
        onClick={() => setTodo((prev) => ({ ...prev, checked: !prev.checked }))}
      >
        {!todo.checked ? <IconSquare /> : <IconSquareCheck />}
      </span>
      <div className="flex gap-1 flex-col w-full">
        <input
          className="font-normal rounded-sm text-base capitalize px-2 ring-1 ring-transparent focus:ring-slate-500 outline-0 text-white/80"
          value={todo.label}
          onChange={(e) => setTodo((prev) => ({ ...prev, label: e.target.value }))}
        />
        <textarea
          className="text-sm px-2 rounded-sm ring-1 ring-transparent focus:ring-slate-500 outline-0 text-white/80 scrollbar"
          value={todo.description}
          onChange={(e) => setTodo((prev) => ({ ...prev, description: e.target.value }))}
        />
      </div>

      <button
        type="button"
        onClick={onDelete}
        className="text-red-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible absolute z-1 right-0.5 top-1/2 rounded -translate-y-1/2 cursor-pointer p-1 bg-white border border-slate-300"
      >
        <IconTrash />
      </button>
    </div>
  );
};

export default Home;
