import clsx from "clsx";
import React, { useState } from "react";

export const Switch = ({ title }: { title: string }) => {
  const [active, setActive] = useState(false);
  return (
    <div
      className="relative items-center w-6 h-full flex cursor-pointer"
      title={title}
      onClick={() => setActive(!active)}
    >
      <div
        className={clsx("w-full h-1 rounded-full transition-all", {
          ["bg-slate-400"]: !active,
          ["bg-indigo-500"]: active,
        })}
      ></div>
      <span
        className={clsx("left-0 w-3 h-3 rounded-full absolute top-1/2 -translate-y-1/2 transition-all ", {
          ["bg-slate-400"]: !active,
          ["translate-x-full bg-indigo-500"]: active,
        })}
      />
    </div>
  );
};
