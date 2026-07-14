import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  children?: React.ReactNode;
  className?: string;
  label?: string;
}
const Input = (props: InputProps) => {
  return (
    <div className="flex flex-col gap-0.5">
      {props.label ? <label className="mt-0 text-slate-400 dark:text-black text-sm">{props.label}</label> : ""}
      <input
        className="text-white bg-white/5 rounded-md border border-slate-400 px-2 py-1.5 text-sm outline-none ring-2 ring-transparent focus:ring-slate-500 transition-all"
        {...props}
      />
    </div>
  );
};

export default Input;
