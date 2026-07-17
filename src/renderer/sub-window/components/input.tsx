import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  children?: React.ReactNode;
  className?: string;
  label?: string;
}
const Input = (props: InputProps) => {
  return (
    <div className="flex flex-col gap-0.5">
      {props.label ? <label className="mt-0 text-slate-500 dark:text-slate-400 text-sm">{props.label}</label> : ""}
      <input
        className="text-slate-800 dark:text-white bg-white dark:bg-white/5 rounded-md border border-slate-300 dark:border-slate-400 px-2 py-1.5 text-sm outline-none ring-2 ring-transparent focus:ring-slate-500 transition-all"
        {...props}
      />
    </div>
  );
};

export default Input;
