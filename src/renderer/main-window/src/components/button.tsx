import clsx from 'clsx'
import React from 'react'

interface IButton extends React.HTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  className?: string
  htmlType?: 'button' | 'submit' | 'reset'
}
const Button = ({ children, className, ...props }: IButton) => {
  return (
    <button
      className={clsx(
        'relative flex min-w-8 cursor-pointer items-center justify-center rounded-md px-3 py-1.5 text-sm text-indigo-500 transition-colors hover:bg-indigo-500/50 hover:text-white',
        className
      )}
      {...props}
      type={props.htmlType || 'button'}
    >
      {children}
    </button>
  )
}

export { Button }
