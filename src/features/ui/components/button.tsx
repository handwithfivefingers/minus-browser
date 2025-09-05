import clsx from "clsx";
import React from "react";

interface IButton extends React.HTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}
const Button = ({ children, className, ...props }: IButton) => {
  return (
    <button
      className={clsx(
        "px-2 rounded-md flex items-center justify-center cursor-pointer hover:bg-indigo-500/50 hover:text-white transition-colors relative text-indigo-500",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export { Button };
