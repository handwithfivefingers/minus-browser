import {
  IconChevronDown,
  IconChevronRight,
  IconClock,
  IconCode,
  IconDatabase,
  IconDeviceFloppy,
  IconFilter,
  IconPuzzle,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { Switch } from "~/features/ui/components";
import { useMinusThemeStore } from "~/features/ui/stores/useMinusTheme";

interface FilterEntry {
  key: string;
  url: string;
  name: string;
  group: string;
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatTimestamp(ts: number): string {
  if (!ts) return "Never";
  const d = new Date(ts);
  return d.toLocaleString();
}

export const Extension = () => {
  const { extension, setExtension, saved } = useMinusThemeStore();
  const {
    adblock,
    translate,
    vault,
    userscript,
    cosmeticFiltering,
    disabledFilters,
    customFilters,
    adblockAutoUpdate,
    adblockAutoUpdateInterval,
  } = extension;
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterEntry[]>([]);
  const [filterSearch, setFilterSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [cacheInfo, setCacheInfo] = useState<{ size: number; timestamp: number; filterCount: number } | null>(null);
  const [stats, setStats] = useState<{ blockedRequests: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [customFilterText, setCustomFilterText] = useState("");
  useEffect(() => {
    (async () => {
      const list: FilterEntry[] = await (window.api.INVOKE as any)("@adb/get-filter-metadata");
      setFilters(list);
      const info = await (window.api.INVOKE as any)("@adb/get-cache-info");
      setCacheInfo(info);
      const s = await (window.api.INVOKE as any)("@adb/get-stats");
      setStats(s);
      const custom: string[] = await (window.api.INVOKE as any)("@adb/get-custom-filters");
      setCustomFilterText(custom?.join("\n"));
    })();
  }, []);

  async function handleClearCache() {
    setIsLoading(true);
    await (window.api.INVOKE as any)("@adb/clear-cache");
    const info = await (window.api.INVOKE as any)("@adb/get-cache-info");
    setCacheInfo(info);
    setIsLoading(false);
  }

  async function handleForceUpdate() {
    setIsLoading(true);
    await (window.api.INVOKE as any)("@adb/clear-cache");
    const info = await (window.api.INVOKE as any)("@adb/get-cache-info");
    setCacheInfo(info);
    setIsLoading(false);
  }

  async function handleSaveCustomFilters() {
    const lines = customFilterText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("!"));
    await (window.api.INVOKE as any)("@adb/set-custom-filters", lines);
  }

  function toggleGroup(group: string) {
    setExpandedGroups((prev) => ({ ...prev, [group]: prev[group] === undefined ? false : !prev[group] }));
  }

  const filteredList = filterSearch
    ? filters.filter((f) => f.name.toLowerCase().includes(filterSearch.toLowerCase()))
    : filters;

  const groupedFilters = filteredList.reduce<Record<string, FilterEntry[]>>((acc, f) => {
    const group = f.group || "Other";
    if (!acc[group]) acc[group] = [];
    acc[group].push(f);
    return acc;
  }, {});

  const sortedGroups = Object.entries(groupedFilters).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <IconPuzzle size={18} className="text-slate-700" />
        <h2 className="text-lg font-semibold text-slate-900">Extension Management</h2>
      </div>

      <div className=" flex flex-col gap-2 p-2 ">
        <div className="flex gap-2 items-center justify-between">
          <span className="font-medium">Translate</span>
          <Switch title="Translate" value={translate} onCheck={(v) => setExtension({ ...extension, translate: v })} />
        </div>
      </div>
      <div className=" flex flex-col gap-2 p-2 ">
        <div className="flex gap-2 items-center justify-between">
          <span className="font-medium">Vault</span>
          <Switch title="Vault" value={vault} onCheck={(v) => setExtension({ ...extension, vault: v })} />
        </div>
      </div>
      <div className=" flex flex-col gap-2 p-2 ">
        <div className="flex gap-2 items-center justify-between">
          <span className="font-medium">UserScript</span>
          <Switch
            title="UserScript"
            value={userscript}
            onCheck={(v) => setExtension({ ...extension, userscript: v })}
          />
        </div>
      </div>
      <div className=" flex flex-col gap-2 p-2 ">
        <div className="flex gap-2 items-center justify-between">
          <span className="font-medium">Adblock</span>
          <Switch title="Adblock" value={adblock} onCheck={(v) => setExtension({ ...extension, adblock: v })} />
        </div>
        {adblock && (
          <div className="flex gap-2 items-center pl-4 w-full justify-between">
            <span className="text-slate-500 w-36 text-sm">Cosmetic Filtering</span>
            <Switch
              title="Cosmetic Filtering"
              value={cosmeticFiltering}
              onCheck={(v) => setExtension({ ...extension, cosmeticFiltering: v })}
            />
          </div>
        )}

        {adblock && (
          <div className="flex flex-col gap-4 bg-slate-100 rounded border border-slate-200 p-2">
            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-2 gap-3 max-w-xs">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <div className="text-xs text-blue-600 font-medium">Blocked Requests</div>
                  <div className="text-xl font-bold text-blue-800">{stats.blockedRequests}</div>
                </div>
              </div>
            )}

            {/* Cache */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <IconDatabase size={14} />
                <span className="font-medium">Filter Cache</span>
              </div>
              {cacheInfo && (
                <div className="text-xs text-slate-500 mb-2 space-y-0.5">
                  <div>Size: {formatBytes(cacheInfo.size)}</div>
                  <div>Last Updated: {formatTimestamp(cacheInfo.timestamp)}</div>
                  <div>Filter Lists: {cacheInfo.filterCount}</div>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClearCache}
                  disabled={isLoading}
                  className="h-8 px-3 rounded-lg bg-red-50 text-red-700 text-xs inline-flex items-center gap-1.5 hover:bg-red-100 border border-red-200 cursor-pointer disabled:opacity-50"
                >
                  <IconTrash size={12} />
                  Clear Cache
                </button>
                <button
                  type="button"
                  onClick={handleForceUpdate}
                  disabled={isLoading}
                  className="h-8 px-3 rounded-lg bg-slate-100 text-slate-700 text-xs inline-flex items-center gap-1.5 hover:bg-slate-200 border border-slate-200 cursor-pointer disabled:opacity-50"
                >
                  <IconRefresh size={12} />
                  Force Update
                </button>
              </div>
              <div className="w-full flex-col">
                <div className="flex justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <IconClock size={14} />
                    <span className="font-medium">Auto Update</span>
                  </div>
                  <Switch
                    title="Auto Update"
                    value={adblockAutoUpdate}
                    onCheck={(v) => setExtension({ ...extension, adblockAutoUpdate: v })}
                  />
                </div>
                {adblockAutoUpdate && (
                  <div className="bg-slate-100 rounded flex flex-col gap-2 p-2">
                    <div className="flex gap-2 items-center">
                      <span className="text-slate-500 w-32 text-sm">Interval</span>
                      <select
                        value={adblockAutoUpdateInterval}
                        onChange={(e) =>
                          setExtension({ ...extension, adblockAutoUpdateInterval: Number(e.target.value) })
                        }
                        className="flex-1 px-2 py-1 text-xs rounded border border-slate-300 bg-white focus:outline-none focus:border-slate-500"
                      >
                        <option value={60}>1 hour</option>
                        <option value={180}>3 hours</option>
                        <option value={360}>6 hours</option>
                        <option value={720}>12 hours</option>
                        <option value={1440}>24 hours</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Filter Lists */}
            <div className="flex flex-col gap-2">
              <div
                role="button"
                tabIndex={0}
                className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none py-1"
                onClick={() => setShowFilters(!showFilters)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowFilters(!showFilters); } }}
              >
                {showFilters ? <IconChevronDown size={20} className="text-slate-500" /> : <IconChevronRight size={20} className="text-slate-500" />}
                <span className="font-medium text-slate-700">
                  Filter Lists ({filters.length})
                </span>
              </div>

              {showFilters && (
                <div className="bg-slate-100 rounded border border-slate-200 flex flex-col overflow-hidden">
                  <div className="sticky top-0 z-10 bg-slate-100 p-2 pb-1">
                    <input
                      type="text"
                      placeholder="Search filters..."
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 bg-white focus:outline-none focus:border-slate-500"
                    />
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {sortedGroups.map(([group, items]) => {
                      const isExpanded = expandedGroups[group] !== false;
                      return (
                        <div key={group} className="border-b border-slate-200 last:border-b-0">
                          <div
                            role="button"
                            tabIndex={0}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 cursor-pointer select-none sticky top-0 bg-slate-100"
                            onClick={() => toggleGroup(group)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleGroup(group); } }}
                          >
                            {isExpanded ? <IconChevronDown size={16} className="text-slate-400 shrink-0" /> : <IconChevronRight size={16} className="text-slate-400 shrink-0" />}
                            <span className="truncate">{group}</span>
                            <span className="text-slate-400 font-normal shrink-0">({items.length})</span>
                          </div>
                          {isExpanded && (
                            <div>
                              <div className="grid grid-cols-[1fr_auto] gap-2 px-3 py-1 text-[10px] text-slate-400 font-medium border-b border-slate-100">
                                <span>Name</span>
                                <span className="pr-2">Status</span>
                              </div>
                              {items.map(({ key, name }) => {
                                const isDisabled = disabledFilters?.includes(key);
                                return (
                                  <div
                                    key={key}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() =>
                                      setExtension({ ...extension, disabledFilters: toggleFilter(disabledFilters, key) })
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        setExtension({ ...extension, disabledFilters: toggleFilter(disabledFilters, key) });
                                      }
                                    }}
                                    className="grid grid-cols-[1fr_auto] gap-2 px-3 py-1.5 text-xs items-center cursor-pointer hover:bg-slate-200 transition-colors select-none border-b border-slate-100 last:border-b-0"
                                  >
                                    <span className="truncate text-slate-600" title={name}>
                                      {name}
                                    </span>
                                    <span
                                      className={clsx(
                                        "text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0",
                                        isDisabled
                                          ? "text-slate-400 bg-slate-200"
                                          : "text-green-700 bg-green-100",
                                      )}
                                    >
                                      {isDisabled ? "Off" : "On"}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Custom Filters */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                <IconCode size={14} />
                <span className="font-medium">Custom Filters</span>
              </div>
              <p className="text-xs text-slate-400 mb-2">
                Add your own filter rules in ABP format (one per line). e.g. <code>||example.com^$script</code>
              </p>
              <textarea
                value={customFilterText}
                onChange={(e) => setCustomFilterText(e.target.value)}
                placeholder={`||example.com^$script\nexample.com##.ad-banner\n@@||example.com^$document`}
                className="w-full max-w-md h-24 px-3 py-2 text-xs font-mono rounded border border-slate-300 bg-white focus:outline-none focus:border-slate-500 resize-y"
              />
              <div className="mt-2">
                <button
                  type="button"
                  onClick={handleSaveCustomFilters}
                  className="h-8 px-3 rounded-lg bg-slate-100 text-slate-700 text-xs inline-flex items-center gap-1.5 hover:bg-slate-200 border border-slate-200 cursor-pointer"
                >
                  Save Custom Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
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
