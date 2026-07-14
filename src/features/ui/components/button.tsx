import clsx from "clsx";
import React from "react";

interface IButton extends React.HTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  htmlType?: "button" | "submit" | "reset";
}
const Button = ({ children, className, ...props }: IButton) => {
  return (
    <button
      className={clsx(
        "px-3 py-1.5 text-sm min-w-8 rounded-md flex items-center justify-center cursor-pointer hover:bg-indigo-500/50 hover:text-white transition-colors relative text-indigo-500",
        className,
      )}
      {...props}
      type={props.htmlType || "button"}
    >
      {children}
    </button>
  );
};

export { Button };
