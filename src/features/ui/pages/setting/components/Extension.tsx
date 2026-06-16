import { IconDeviceFloppy, IconFilter, IconPuzzle } from "@tabler/icons-react";
import clsx from "clsx";
import { useState } from "react";
import { Switch } from "~/features/ui/components";
import { useMinusThemeStore } from "~/features/ui/stores/useMinusTheme";

const FILTERS: Record<string, string> = {
  "f4c9ccf98ce5d9d6e432058ad93b7ad7": "YouTube No Thumbnails",
  "21442ad94c9864d18fbfe288a5dbc559": "YouTube Shorts",
  "850920d2ea651475c864ec5a44498d3b": "YouTube Recommended",
  "16bdb780ac49d6119990ba069a4f69aa": "YouTube Distracting",
};

const toggleFilter = (current: string[], key: string): string[] => {
  const set = new Set(current);
  if (set.has(key)) {
    set.delete(key);
  } else {
    set.add(key);
  }
  return [...set];
};

export const Extension = () => {
  const { extension, setExtension, saved } = useMinusThemeStore();
  const { adblock, translate, vault, userscript, disabledFilters } = extension;
  const [showFilters, setShowFilters] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <IconPuzzle size={18} className="text-slate-700" />
        <h2 className="text-lg font-semibold text-slate-900">Extension Management</h2>
      </div>
      <div className="w-60 bg-slate-100 rounded flex flex-col gap-2 p-2 border border-slate-200">
        <div className="flex gap-2 items-center">
          <label className="text-slate-600 w-40 ">Adblock</label>
          <Switch title="Adblock" value={adblock} onCheck={(v) => setExtension({ ...extension, adblock: v })} />
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-slate-600 w-40 ">Translate</label>
          <Switch title="Translate" value={translate} onCheck={(v) => setExtension({ ...extension, translate: v })} />
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-slate-600 w-40 ">Vault</label>
          <Switch title="Vault" value={vault} onCheck={(v) => setExtension({ ...extension, vault: v })} />
        </div>
        <div className="flex gap-2 items-center w-full">
          <label className="text-slate-600 w-40 ">UserScript</label>
          <Switch
            title="UserScript"
            className=""
            value={userscript}
            onCheck={(v) => setExtension({ ...extension, userscript: v })}
          />
        </div>
      </div>
      {adblock && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
          >
            <IconFilter size={14} />
            Filter Lists
            <span className={clsx("transition-transform", showFilters && "rotate-180")}>▼</span>
          </button>
          {showFilters && (
            <div className="mt-2 w-72 bg-slate-100 rounded flex flex-col gap-2 p-2 border border-slate-200">
              {Object.entries(FILTERS).map(([key, label]) => {
                const isDisabled = disabledFilters?.includes(key);
                return (
                  <div key={key} className="flex gap-2 items-center">
                    <label className="text-slate-600 flex-1 text-sm">{label}</label>
                    <Switch
                      title={label}
                      value={!isDisabled}
                      onCheck={() => setExtension({ ...extension, disabledFilters: toggleFilter(disabledFilters, key) })}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <div className="pt-5">
        <button
          type="button"
          onClick={saved}
          className="h-10 px-4 rounded-lg bg-slate-900 text-white text-sm inline-flex items-center gap-2 hover:bg-slate-700 cursor-pointer"
        >
          <IconDeviceFloppy size={16} />
          Save
        </button>
      </div>
    </div>
  );
};
