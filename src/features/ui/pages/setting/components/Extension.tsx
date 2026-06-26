import { IconDeviceFloppy, IconFilter, IconPuzzle } from "@tabler/icons-react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { Switch } from "~/features/ui/components";
import { useMinusThemeStore } from "~/features/ui/stores/useMinusTheme";

interface FilterEntry {
  key: string;
  url: string;
  name: string;
}

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
  const { adblock, translate, vault, userscript, cosmeticFiltering, disabledFilters } = extension;
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterEntry[]>([]);
  const [filterSearch, setFilterSearch] = useState("");

  useEffect(() => {
    if (showFilters && filters.length === 0) {
      (window.api.INVOKE as any)("@adb/get-filter-metadata").then((list: FilterEntry[]) => setFilters(list));
    }
  }, [showFilters, filters.length]);

  const filteredList = filterSearch
    ? filters.filter((f) => f.name.toLowerCase().includes(filterSearch.toLowerCase()))
    : filters;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <IconPuzzle size={18} className="text-slate-700" />
        <h2 className="text-lg font-semibold text-slate-900">Extension Management</h2>
      </div>
      <div className="w-60 bg-slate-100 rounded flex flex-col gap-2 p-2 border border-slate-200">
        <div className="flex gap-2 items-center">
          <span className="text-slate-600 w-40">Adblock</span>
          <Switch title="Adblock" value={adblock} onCheck={(v) => setExtension({ ...extension, adblock: v })} />
        </div>
        {adblock && (
          <div className="flex gap-2 items-center pl-4">
            <span className="text-slate-500 w-36 text-sm">Cosmetic Filtering</span>
            <Switch
              title="Cosmetic Filtering"
              value={cosmeticFiltering}
              onCheck={(v) => setExtension({ ...extension, cosmeticFiltering: v })}
            />
          </div>
        )}
        <div className="flex gap-2 items-center">
          <span className="text-slate-600 w-40">Translate</span>
          <Switch title="Translate" value={translate} onCheck={(v) => setExtension({ ...extension, translate: v })} />
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-slate-600 w-40">Vault</span>
          <Switch title="Vault" value={vault} onCheck={(v) => setExtension({ ...extension, vault: v })} />
        </div>
        <div className="flex gap-2 items-center w-full">
          <span className="text-slate-600 w-40">UserScript</span>
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
            Filter Lists ({filters.length})
            <span className={clsx("transition-transform", showFilters && "rotate-180")}>▼</span>
          </button>
          {showFilters && (
            <div className="mt-2 max-h-80 overflow-y-auto bg-slate-100 rounded flex flex-col gap-1 p-2 border border-slate-200">
              <input
                type="text"
                placeholder="Search filters..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="mb-1 px-2 py-1 text-xs rounded border border-slate-300 bg-white focus:outline-none focus:border-slate-500"
              />
              {filteredList.map(({ key, name }) => {
                const isDisabled = disabledFilters?.includes(key);
                return (
                  <div key={key} className="flex gap-2 items-center">
                    <span className="text-slate-600 flex-1 text-xs truncate" title={name}>
                      {name}
                    </span>
                    <Switch
                      title={name}
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
