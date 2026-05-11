import {
  IconAdjustments,
  IconCode,
  IconDatabase,
  IconDeviceFloppy,
  IconLayoutGrid,
  IconShieldLock,
} from "@tabler/icons-react";
import clsx from "clsx";
import { type Dispatch, type SetStateAction, useState } from "react";
import { useMinusThemeStore } from "../../stores/useMinusTheme";
import { UserScriptSection } from "./components/UserScriptSection";
import { VaultSection } from "./components/VaultSetting";

type SettingTab = "system" | "userscript" | "vault";

enum LayoutTemplate {
  BASIC = "BASIC",
  FLOATING = "FLOATING",
}

const CLASSES = {
  BASIC: "bg-slate-50 w-full h-full p-6",
  FLOATING: "bg-slate-50 w-full h-full rounded-xl p-6",
};

interface ISystemForm {
  intervalTime: string;
  hardwareAcceleration: string;
  layout: "FLOATING" | "BASIC";
  savedCookies: "0" | "1";
}

const Sidebar = ({ active, onChange }: { active: SettingTab; onChange: (tab: SettingTab) => void }) => {
  const tabs: Array<{ id: SettingTab; label: string; icon: React.ReactNode }> = [
    { id: "system", label: "System", icon: <IconAdjustments size={16} /> },
    { id: "userscript", label: "UserScript", icon: <IconCode size={16} /> },
    {
      id: "vault",
      label: "Password Vault",
      icon: <IconShieldLock size={16} />,
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

const SystemSection = ({
  form,
  setForm,
  onSave,
}: {
  form: ISystemForm;
  setForm: Dispatch<SetStateAction<ISystemForm>>;
  onSave: () => void;
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <IconDatabase size={18} className="text-slate-700" />
        <h2 className="text-lg font-semibold text-slate-900">System Preferences</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-slate-600">Sync Data Interval</span>
          <select
            value={form.intervalTime}
            onChange={(event) => setForm((prev) => ({ ...prev, intervalTime: event.target.value }))}
            className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm"
          >
            <option value="15">15 sec</option>
            <option value="30">30 sec</option>
            <option value="45">45 sec</option>
            <option value="60">60 sec</option>
            <option value="off">Off</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-slate-600">Hardware Acceleration</span>
          <select
            value={form.hardwareAcceleration}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                hardwareAcceleration: event.target.value,
              }))
            }
            className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm"
          >
            <option value="0">Off</option>
            <option value="1">On</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-slate-600">Cookie saved as</span>
          <select
            value={form.savedCookies}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                savedCookies: event.target.value as "0" | "1",
              }))
            }
            className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm"
          >
            <option value="0">System</option>
            <option value="1">File</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 md:col-span-2">
          <span className="text-sm text-slate-600">Layout Template</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <button
              type="button"
              className={clsx(
                "h-11 px-3 rounded-lg border text-sm inline-flex items-center justify-center gap-2 cursor-pointer",
                form.layout === LayoutTemplate.BASIC
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50",
              )}
              onClick={() => setForm((prev) => ({ ...prev, layout: LayoutTemplate.BASIC }))}
            >
              <IconLayoutGrid size={16} />
              BASIC
            </button>
            <button
              type="button"
              className={clsx(
                "h-11 px-3 rounded-lg border text-sm inline-flex items-center justify-center gap-2 cursor-pointer",
                form.layout === LayoutTemplate.FLOATING
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50",
              )}
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  layout: LayoutTemplate.FLOATING,
                }))
              }
            >
              <IconLayoutGrid size={16} />
              FLOATING
            </button>
          </div>
        </label>
      </div>

      <div className="pt-5">
        <button
          type="button"
          onClick={onSave}
          className="h-10 px-4 rounded-lg bg-slate-900 text-white text-sm inline-flex items-center gap-2 hover:bg-slate-700 cursor-pointer"
        >
          <IconDeviceFloppy size={16} />
          Save System Settings
        </button>
      </div>
    </div>
  );
};

const Setting = () => {
  const { layout, mode, initialize } = useMinusThemeStore();
  const [activeTab, setActiveTab] = useState<SettingTab>("system");
  const [systemForm, setSystemForm] = useState<ISystemForm>({
    intervalTime: "15",
    hardwareAcceleration: "1",
    savedCookies: "0",
    layout,
  });

  const saveSystem = () => {
    const data = {
      layout: systemForm.layout,
      mode,
      dataSync: {
        intervalTime: systemForm.intervalTime,
        hardwareAcceleration: systemForm.hardwareAcceleration,
      },
    };
    window.api.INVOKE("INTERFACE_SAVE", data);
    initialize(data);
  };

  return (
    <div className="relative bg-slate-800 h-full w-full">
      <div className={CLASSES[layout]}>
        <div className="h-full rounded-xl border border-slate-200 bg-slate-100 p-3 md:p-4 flex gap-3 overflow-hidden">
          <Sidebar active={activeTab} onChange={setActiveTab} />

          <main className="flex-1 min-w-0 overflow-auto">
            {activeTab === "system" && <SystemSection form={systemForm} setForm={setSystemForm} onSave={saveSystem} />}
            {activeTab === "userscript" && <UserScriptSection />}
            {activeTab === "vault" && <VaultSection />}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Setting;
