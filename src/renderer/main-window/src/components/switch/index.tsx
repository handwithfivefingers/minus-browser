import clsx from 'clsx'

interface Props {
  label?: string
  className?: string
  onCheck?: (v: boolean) => void
  value?: boolean
}
export const Switch = ({ label, className, onCheck, value = false }: Props) => {
  return (
    <div className={clsx('flex flex-col gap-0.5', className)}>
      {label && <label className="mt-0 text-sm text-slate-400 dark:text-slate-400">{label}</label>}
      <div className="relative inline-flex cursor-pointer items-center" onClick={() => onCheck?.(!value)}>
        <input type="checkbox" className="peer invisible sr-only" checked={value ?? true} />
        <div className="peer h-5 w-9 rounded-full bg-slate-300 peer-checked:bg-indigo-500 peer-focus:outline-none after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
      </div>
    </div>
  )
}
