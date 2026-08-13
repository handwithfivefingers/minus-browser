import { RefObject } from 'react'

import { GROUP_COLORS } from './types'

interface CreateGroupProps {
  editGroup: { id: string; name: string; color: string } | null
  groupName: string
  groupColor: string
  menuRef: RefObject<HTMLDivElement | null>
  inputRef: RefObject<HTMLInputElement | null>
  style: React.CSSProperties
  onNameChange: (name: string) => void
  onColorChange: (color: string) => void
  onSave: () => void
  onCancel: () => void
}

export const CreateGroup = ({
  editGroup,
  groupName,
  groupColor,
  menuRef,
  inputRef,
  style,
  onNameChange,
  onColorChange,
  onSave,
  onCancel,
}: CreateGroupProps) => {
  return (
    <div
      ref={menuRef}
      className="fixed flex w-64 flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-800"
      style={style}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {editGroup ? 'Edit Group' : 'New Group'}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="p-0.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-label="Back"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <input
        ref={inputRef}
        className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
        placeholder="Group name"
        value={groupName}
        onChange={(e) => onNameChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSave()
          }
        }}
      />

      <div className="flex flex-wrap gap-1.5">
        {GROUP_COLORS.map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => onColorChange(c)}
            className={`h-5 w-5 rounded-full border-2 transition-all ${groupColor === c ? 'scale-110 border-slate-700 dark:border-slate-300' : 'border-transparent'}`}
            style={{ backgroundColor: c }}
            aria-label={`Color ${c}`}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={!groupName.trim()}
        className="flex w-full items-center justify-center gap-1 rounded bg-indigo-500 py-1.5 text-sm text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {editGroup ? 'Save' : 'Create'}
      </button>
    </div>
  )
}
