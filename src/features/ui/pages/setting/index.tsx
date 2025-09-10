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
    <div className="relative px-2 bg-slate-800 h-full">
      <TodoHome />
    </div>
  );
};

const TodoHome = () => {
  return (
    <div className="flex justify-center h-full items-center-safe py-40 flex-col gap-8">
      <div className="flex gap-1 px-2 py-1">
        <div>Sync:</div>
        <select>
          <option>15 Sec</option>
          <option>30 Sec</option>
          <option>45 Sec</option>
          <option>1 Min</option>
          <option>When Close Tab</option>
          <option>When Close App</option>
        </select>
      </div>
    </div>
  );
};

export default Home;
