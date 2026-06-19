import { IconClock, IconHistory, IconRefresh, IconSearch, IconTrash, IconX } from "@tabler/icons-react";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useMinusThemeStore } from "../../stores/useMinusTheme";

interface IHistoryEntry {
  id: string;
  url: string;
  title: string;
  favicon: string;
  timestamp: number;
  visitCount: number;
}

const CLASSES = {
  BASIC: "bg-slate-50 w-full h-full p-6",
  FLOATING: "bg-slate-50 w-full h-full rounded-xl p-6",
};

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function getDateGroup(ts: number): string {
  const now = new Date();
  const date = new Date(ts);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 6 * 86400000);

  if (date >= today) return "Today";
  if (date >= yesterday) return "Yesterday";
  if (date >= weekAgo) return "Last 7 Days";
  return "Older";
}

const History = () => {
  const { layout } = useMinusThemeStore();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<IHistoryEntry[]>([]);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const loadHistory = useCallback(async () => {
    const data = await window.api.INVOKE<IHistoryEntry[]>("GET_HISTORY");
    setEntries(data || []);
  }, []);

  useEffect(() => {
    loadHistory();
    const interval = setInterval(loadHistory, 3000);
    return () => clearInterval(interval);
  }, [loadHistory]);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const openUrl = async (url: string) => {
    const tab = await window.api.INVOKE<{ id: string }>("CREATE_TAB", { url });
    if (tab?.id) navigate(`/${tab.id}`);
  };

  const deleteEntry = async (id: string) => {
    await window.api.INVOKE("DELETE_HISTORY", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const clearAll = async () => {
    await window.api.INVOKE("CLEAR_HISTORY");
    setEntries([]);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter((e) => e.title.toLowerCase().includes(q) || e.url.toLowerCase().includes(q));
  }, [entries, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, IHistoryEntry[]> = {};
    for (const entry of filtered) {
      const group = getDateGroup(entry.timestamp);
      if (!groups[group]) groups[group] = [];
      groups[group].push(entry);
    }
    return groups;
  }, [filtered]);

  const groupOrder = ["Today", "Yesterday", "Last 7 Days", "Older"];

  return (
    <div className="relative bg-slate-800 h-full w-full">
      <div className={CLASSES[layout as keyof typeof CLASSES]}>
        <div className="h-full rounded-xl border border-slate-200 bg-slate-100 flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-slate-200 bg-white shrink-0">
            <IconHistory size={20} className="text-slate-600" />
            <h1 className="text-lg font-semibold text-slate-800 flex-1">History</h1>
            <div className="relative max-w-xs w-full">
              <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search history..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <IconX size={14} />
                </button>
              )}
            </div>
            <button
              onClick={loadHistory}
              className="text-sm text-slate-600 hover:text-slate-800 flex items-center gap-1 cursor-pointer px-2 py-1 rounded hover:bg-slate-200"
            >
              <IconRefresh size={14} />
            </button>
            {entries.length > 0 && (
              <button
                onClick={clearAll}
                className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer px-2 py-1 rounded hover:bg-red-50"
              >
                <IconTrash size={14} />
                Clear All
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                <IconClock size={48} />
                <p className="text-lg font-medium">No history yet</p>
                <p className="text-sm">Start browsing to see your history here</p>
              </div>
            ) : (
              groupOrder.map((group) => {
                const items = grouped[group];
                if (!items || items.length === 0) return null;
                return (
                  <div key={group} className="mb-6">
                    <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1">{group}</h2>
                    <div className="space-y-0.5">
                      {items.map((entry) => (
                        <div
                          key={entry.id}
                          className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white cursor-pointer transition-colors"
                          onClick={() => openUrl(entry.url)}
                        >
                          {entry.favicon ? (
                            <img src={entry.favicon} alt="" className="w-5 h-5 rounded shrink-0" />
                          ) : (
                            <div className="w-5 h-5 rounded bg-slate-300 shrink-0 flex items-center justify-center text-xs text-slate-500">
                              {entry.title.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-800 truncate">{entry.title}</div>
                            <div className="text-xs text-slate-400 truncate">{entry.url}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {entry.visitCount > 1 && (
                              <span className="text-xs text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full">{entry.visitCount}</span>
                            )}
                            <span className="text-xs text-slate-400 hidden sm:inline">{formatRelativeTime(entry.timestamp)}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteEntry(entry.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 cursor-pointer p-1 transition-opacity"
                            >
                              <IconTrash size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default History;
