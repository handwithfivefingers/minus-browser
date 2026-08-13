import { IconComponents, IconHistory, IconPlus, IconSettings } from '@tabler/icons-react'
import { Link, useLocation } from 'react-router'

import { IPC_TAB_GROUP_EMIT } from '~/shared/constants/ipc/tabGroup'

import { NotificationBell } from '../../features/notification'
import { Tab } from '../../interfaces/tab'
import { cn } from '../../libs/cn'

interface SubMenuItemProps {
  tabs: Tab[]
  onAddNewTab: (tab: Partial<Tab>) => void
}

const NAV_ITEM_CLASS =
  'z-1 flex w-full shrink-0 cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-md px-0.5 py-1 text-slate-500 transition-colors hover:bg-white hover:text-indigo-500 dark:text-slate-400 dark:hover:bg-slate-800'

export const SubMenuItem = ({ tabs, onAddNewTab }: SubMenuItemProps) => {
  const pathname = useLocation().pathname
  return (
    <div className="sticky bottom-0 flex flex-col items-center border-t border-slate-300 py-2 dark:border-slate-700">
      <button
        onClick={() => {
          if (tabs.length > 0) {
            window.api.EMIT(IPC_TAB_GROUP_EMIT.SHOW_TAB_CONTEXT_MENU, {
              x: 100,
              y: 100,
            })
          }
        }}
        className={NAV_ITEM_CLASS}
        title="Group tabs together — right-click any tab to add it to a group"
      >
        <IconComponents size={16} />
        <span className="text-[10px] font-medium">Groups</span>
      </button>

      <button onClick={() => onAddNewTab({})} className={NAV_ITEM_CLASS}>
        <IconPlus size={16} />
        <span className="text-[10px] font-medium">New Tab</span>
      </button>
      <NotificationBell />
      <Link
        to="/history"
        className={cn(NAV_ITEM_CLASS, {
          [`bg-white text-slate-500 shadow-md dark:bg-slate-700 dark:text-slate-300`]: pathname === '/history',
        })}
      >
        <IconHistory size={16} />
        <span className="text-[10px] font-medium">History</span>
      </Link>
      <Link
        to="/setting"
        className={cn(NAV_ITEM_CLASS, {
          [`bg-white text-slate-500 shadow-md dark:bg-slate-700 dark:text-slate-300`]: pathname === '/setting',
        })}
      >
        <IconSettings size={16} />
        <span className="text-[10px] font-medium">Setting</span>
      </Link>
    </div>
  )
}
