import React from 'react'

interface TextAreaProps extends React.InputHTMLAttributes<HTMLTextAreaElement> {
  children?: React.ReactNode
  className?: string
  label?: string
}
const TextArea = (props: TextAreaProps) => {
  return (
    <div className="flex flex-col gap-0.5">
      {props.label ? <label className="mt-0 text-sm text-slate-500 dark:text-slate-400">{props.label}</label> : ''}
      <textarea
        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 ring-2 ring-transparent transition-all outline-none focus:ring-slate-500 dark:border-slate-400 dark:bg-white/5 dark:text-white"
        style={{
          minHeight: '92px',
          resize: 'vertical',
        }}
        {...props}
      />
    </div>
  )
}

export default TextArea
