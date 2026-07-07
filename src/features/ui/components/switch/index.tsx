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
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" checked={value ?? true} onChange={(e) => onCheck?.(!value)} />
      <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-indigo-500 peer-focus:outline-none after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
    </label>
  );
};
