import clsx from "clsx";
import { useState } from "react";

interface Props {
  title: string;
  className?: string;
  onCheck?: (v: boolean) => void;
  value?: boolean;
}
export const Switch = ({ title, className, onCheck, value = false }: Props) => {
  return (
    <div
      className={clsx("relative items-center w-6 h-full flex cursor-pointer", className)}
      title={title}
      onClick={() => onCheck?.(!value)}
    >
      <div
        className={clsx("w-full h-1 rounded-full transition-all", {
          ["bg-slate-400"]: !value,
          ["bg-indigo-500"]: value,
        })}
      ></div>
      <span
        className={clsx("left-0 w-3 h-3 rounded-full absolute top-1/2 -translate-y-1/2 transition-all ", {
          ["bg-slate-400"]: !value,
          ["translate-x-full bg-indigo-500"]: value,
        })}
      />
    </div>
  );
};
