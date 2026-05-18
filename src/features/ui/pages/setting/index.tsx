import { IconAdjustments, IconCode, IconPuzzle, IconShieldLock } from "@tabler/icons-react";
import clsx from "clsx";
import { useState } from "react";
import { useMinusThemeStore } from "../../stores/useMinusTheme";
import { Interface } from "./components/Interface";
import { UserScriptSection } from "./components/UserScriptSection";
import { VaultSection } from "./components/VaultSetting";
import { Extension } from "./components/Extension";

type SettingTab = "system" | "userscript" | "vault" | "extension";

const CLASSES = {
  BASIC: "bg-slate-50 w-full h-full p-6",
  FLOATING: "bg-slate-50 w-full h-full rounded-xl p-6",
};

const Sidebar = ({ active, onChange }: { active: SettingTab; onChange: (tab: SettingTab) => void }) => {
  const tabs: Array<{ id: SettingTab; label: string; icon: React.ReactNode }> = [
    { id: "system", label: "System", icon: <IconAdjustments size={16} /> },
    { id: "userscript", label: "UserScript", icon: <IconCode size={16} /> },
    {
      id: "vault",
      label: "Password Vault",
      icon: <IconShieldLock size={16} />,
    },
    {
      id: "extension",
      label: "Extension",
      icon: <IconPuzzle size={16} />,
    },
  ];

  return (
    <aside className="w-[230px] shrink-0 bg-white rounded-xl border border-slate-200 p-3">
      <div className="px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Settings</div>
      <div className="flex flex-col gap-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={clsx(
              "w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 text-sm cursor-pointer border",
              active === tab.id
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
};

const Setting = () => {
  const { layout } = useMinusThemeStore();
  const [activeTab, setActiveTab] = useState<SettingTab>("system");
  return (
    <div className="relative bg-slate-800 h-full w-full">
      <div className={CLASSES[layout as keyof typeof CLASSES]}>
        <div className="h-full rounded-xl border border-slate-200 bg-slate-100 p-3 md:p-4 flex gap-3 overflow-hidden">
          <Sidebar active={activeTab} onChange={setActiveTab} />

          <main className="flex-1 min-w-0 overflow-auto">
            {activeTab === "system" && <Interface />}
            {activeTab === "userscript" && <UserScriptSection />}
            {activeTab === "vault" && <VaultSection />}
            {activeTab === "extension" && <Extension />}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Setting;
