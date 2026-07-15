import clsx from "clsx";

interface Props {
  label?: string;
  className?: string;
  onCheck?: (v: boolean) => void;
  value?: boolean;
}
export const Switch = ({ label, className, onCheck, value = false }: Props) => {
  return (
    <div className={clsx("flex flex-col gap-0.5", className)}>
      {label && <label className="mt-0 text-slate-400 dark:text-black text-sm">{label}</label>}
      <div className="relative inline-flex items-center cursor-pointer" onClick={() => onCheck?.(!value)}>
        <input type="checkbox" className="sr-only peer invisible" checked={value ?? true} />
        <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-indigo-500 peer-focus:outline-none after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
      </div>
    </div>
  );
};
