import { IconPlus, IconSquare, IconSquareCheck, IconTrash } from "@tabler/icons-react";
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { v4 as uuidV4 } from "uuid";
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

  useLayoutEffect(() => {
    const todo = localStorage.getItem("APP_TODO");
    if (JSON.parse(todo)?.length > 0) {
      setTodos(JSON.parse(todo));
    } else {
      setTodos([{ label: "new todo", description: "new description", checked: false, id: uuidV4() }]);
    }
  }, []);

  const addNewTodo = () => {
    const newTodo = { label: "new todo", description: "new description", checked: false, id: uuidV4() };
    const nextState = [...todos, newTodo];
    localStorage.setItem("APP_TODO", JSON.stringify(todos));
    startTransition(() => {
      setTodos(nextState);
    });
  };

  const onSave = (todoItem: ITodoItem) => {
    const nextState = [...todos].map((item) => {
      if (item.id === todoItem.id) {
        return todoItem;
      }
      return item;
    });
    localStorage.setItem("APP_TODO", JSON.stringify(nextState));
    startTransition(() => {
      setTodos(nextState);
    });
  };
  const onDelete = (todoItem: ITodoItem) => {
    const nextState = [...todos].filter((item) => item.id !== todoItem.id);
    localStorage.setItem("APP_TODO", JSON.stringify(nextState));
    startTransition(() => {
      setTodos(nextState);
    });
  };
  return (
    <div className="flex justify-center h-full items-center-safe py-20 flex-col gap-8 w-full">
      <div className="flex-1 flex-shrink-0 gap-2 flex">
        <span className="font-medium text-3xl text-white">{DATE_OUTPUT[new Date().getDay()]}</span>
        <span className="font-medium text-3xl text-white">
          {new Date().getDate()}/{new Date().getMonth()}/{new Date().getFullYear()}
        </span>
      </div>
      <div className="flex-1 flex-shrink-0">
        <span ref={hourRef} className="font-medium text-8xl text-white" />
        <span className="font-medium text-8xl text-white">:</span>
        <span ref={minRef} className="font-medium text-8xl text-white" />
      </div>
      <div className="h-full w-full max-w-80 flex gap-2 flex-col">
        <div className="flex gap-2 flex-col max-h-[275px] overflow-x-hiddenoverflow-y-auto scrollbar">
          {todos?.map((item) => {
            return <TodoItem {...item} key={item.id} onSave={onSave} onDelete={() => onDelete(item)} />;
          })}
        </div>

        <button
          className="text-white cursor-pointer sticky bottom-0 flex gap-2 items-center mx-auto bg-indigo-500/50 rounded p-2"
          onClick={addNewTodo}
          disabled={isPending}
        >
          <IconPlus />
          <span>New Todo</span>
        </button>
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
    let timeout;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      onSave(todo);
    }, 750);
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [todo]);
  return (
    <div className="flex bg-white p-2 px-4 gap-4 rounded-md group relative">
      <span
        className="cursor-pointer text-indigo-500"
        onClick={() => setTodo((prev) => ({ ...prev, checked: !prev.checked }))}
      >
        {!todo.checked ? <IconSquare /> : <IconSquareCheck />}
      </span>
      <div className="flex gap-1 flex-col">
        <input
          className="font-normal text-xl capitalize px-2 focus:outline-indigo-500/50"
          value={todo.label}
          onChange={(e) => setTodo((prev) => ({ ...prev, label: e.target.value }))}
        />
        <textarea
          className="text-base text-slate-500 px-2 focus:outline-indigo-500/50"
          value={todo.description}
          onChange={(e) => setTodo((prev) => ({ ...prev, description: e.target.value }))}
        />
      </div>

      <button
        onClick={onDelete}
        className="text-red-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible absolute z-[1] right-0.5 top-1/2 rounded -translate-y-1/2 cursor-pointer p-1"
      >
        <IconTrash />
      </button>
    </div>
  );
};

export default Home;
