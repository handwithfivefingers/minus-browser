import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLSelectElement> {
  children?: React.ReactNode
  className?: string
  label?: string
  options: { label: string; value: string }[]
}
const Select = ({ options, ...props }: InputProps) => {
  return (
    <div className="flex flex-col gap-0.5">
      {props.label ? <label className="mt-0 text-sm text-slate-500 dark:text-slate-400">{props.label}</label> : ''}
      <select
        className="rounded-md border border-slate-300 bg-white text-slate-800 dark:border-slate-400 dark:bg-white/5 dark:text-white"
        style={{ padding: '8px', fontSize: '12px' }}
        {...props}
      >
        {options?.map((item, index) => {
          return (
            <option value={item.value} key={`option-${item.value}-${index}`}>
              {item.label}
            </option>
          )
        })}
      </select>
    </div>
  )
}

export default Select
