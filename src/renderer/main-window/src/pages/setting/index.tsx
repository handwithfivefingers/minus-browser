import {
  IconAdjustments,
  IconBrain,
  IconCode,
  IconPuzzle,
  IconShieldLock,
  IconSnowflake,
  IconWorld,
} from '@tabler/icons-react'
import clsx from 'clsx'
import { useState } from 'react'

import { useMinusThemeStore } from '../../stores/useMinusTheme'

import { AiSettings } from './components/AiSettings'
import { Extension } from './components/Extension'
import { HibernateSetting } from './components/HibernateSetting'
import { Interface } from './components/Interface'
import { SiteSettings } from './components/SiteSettings'
import { UserScriptSection } from './components/UserScriptSection'
import { VaultSection } from './components/VaultSetting'

type SettingTab = 'system' | 'userscript' | 'vault' | 'extension' | 'ai' | 'hibernate' | 'sites'

const CLASSES = {
  BASIC: 'bg-slate-50 dark:bg-slate-950 w-full h-full p-4',
  FLOATING: 'bg-slate-50 dark:bg-slate-950 w-full h-full rounded-xl p-4',
}

const Sidebar = ({ active, onChange }: { active: SettingTab; onChange: (tab: SettingTab) => void }) => {
  const tabs: Array<{ id: SettingTab; label: string; icon: React.ReactNode }> = [
    { id: 'system', label: 'System', icon: <IconAdjustments size={16} /> },
    { id: 'userscript', label: 'UserScript', icon: <IconCode size={16} /> },
    {
      id: 'vault',
      label: 'Password Vault',
      icon: <IconShieldLock size={16} />,
    },
    {
      id: 'extension',
      label: 'Extension',
      icon: <IconPuzzle size={16} />,
    },
    {
      id: 'ai',
      label: 'AI Sidebar',
      icon: <IconBrain size={16} />,
    },
    {
      id: 'hibernate',
      label: 'Hibernate',
      icon: <IconSnowflake size={16} />,
    },
    {
      id: 'sites',
      label: 'Site Settings',
      icon: <IconWorld size={16} />,
    },
  ]

  return (
    <aside className="w-57.5 shrink-0 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
      <div className="px-2 py-2 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
        Settings
      </div>
      <div className="flex flex-col gap-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={clsx(
              'flex w-full cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm',
              active === tab.id
                ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}

const Setting = () => {
  const { layout } = useMinusThemeStore()
  const [activeTab, setActiveTab] = useState<SettingTab>('system')
  return (
    <div className={clsx(CLASSES[layout as keyof typeof CLASSES], 'flex gap-2')}>
      {/* <div className="h-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 p-3 md:p-4 flex gap-3 overflow-hidden"> */}
      <Sidebar active={activeTab} onChange={setActiveTab} />
      <main className="scrollbar min-w-0 flex-1 overflow-auto">
        {activeTab === 'system' && <Interface />}
        {activeTab === 'userscript' && <UserScriptSection />}
        {activeTab === 'vault' && <VaultSection />}
        {activeTab === 'extension' && <Extension />}
        {activeTab === 'ai' && <AiSettings />}
        {activeTab === 'hibernate' && <HibernateSetting />}
        {activeTab === 'sites' && <SiteSettings />}
      </main>
      {/* </div> */}
    </div>
  )
}

export default Setting
