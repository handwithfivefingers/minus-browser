import {
  IconArrowRight,
  IconClock,
  IconPlus,
  IconSearch,
  IconSwitchHorizontal,
  IconX,
  IconWorld,
} from "@tabler/icons-react";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import { Tab } from "~/features/ui/interfaces";
import { isValidDomainOrIP, navigateOrSearch } from "../../ui/libs";
import { IPC_EMIT_CHANNEL } from "~/shared/constants/ipc";

interface IHistoryEntry {
  id: string;
  url: string;
  title: string;
  favicon: string;
  timestamp: number;
  visitCount: number;
}

interface SpotlightProps {
  query: string;
  activeTabId?: string;
}

type SpotlightAction =
  | {
      id: string;
      kind: "tab";
      label: string;
      description: string;
      onSelect: () => void;
      score: number;
    }
  | {
      id: string;
      kind: "history";
      label: string;
      description: string;
      onSelect: () => void;
      score: number;
    }
  | {
      id: string;
      kind: "search";
      label: string;
      description: string;
      onSelect: () => void;
      score: number;
    }
  | {
      id: string;
      kind: "create";
      label: string;
      description: string;
      onSelect: () => void;
      score: number;
    };

const SpotlightApp = () => {
  const [query, setQuery] = useState("");
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [history, setHistory] = useState<IHistoryEntry[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [activeTabId, setActiveTabId] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const hasTabs = tabs.length > 0;

  const fetchTabs = useCallback(async () => {
    try {
      const result = await window.api.INVOKE<Tab[]>("GET_TABS");
      setTabs(result || []);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const result = await window.api.INVOKE<IHistoryEntry[]>("GET_HISTORY");
      setHistory(result || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem("subWindowPayload");
    sessionStorage.removeItem("subWindowPayload");
    if (raw) {
      try {
        const payload = JSON.parse(raw) as SpotlightProps;
        setQuery(payload?.query || "");
        setActiveTabId(payload?.activeTabId);
      } catch {
        /* ignore */
      }
    }

    setActiveIndex(0);
    setVisible(true);
    fetchTabs();
    fetchHistory();

    inputRef.current?.focus();
    inputRef.current?.select();

    window.api.LISTENER("GET_TABS", (payload?: Tab[]) => {
      setTabs(payload || []);
    });

    window.api.LISTENER("GET_HISTORY", (payload?: IHistoryEntry[]) => {
      setHistory(payload || []);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeSpotlight();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!visible) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [visible]);

  const normalizedQuery = query.trim();

  const navigateCurrentTab = (url: string) => {
    if (activeTabId) {
      window.api.EMIT("VIEW_CHANGE_URL", { id: activeTabId, url });
    } else {
      window.api.INVOKE<{ id: string }>("CREATE_TAB", { url });
    }
  };

  const closeSpotlight = () => {
    setVisible(false);
    window.api.EMIT(IPC_EMIT_CHANNEL.SPOTLIGHT_CLOSE);
  };

  const fuseTabs = useMemo(
    () =>
      new Fuse(tabs, {
        keys: [
          { name: "title", weight: 0.6 },
          { name: "url", weight: 0.4 },
        ],
        threshold: 0.4,
        distance: 100,
        minMatchCharLength: 1,
      }),
    [tabs],
  );

  const fuseHistory = useMemo(
    () =>
      new Fuse(history, {
        keys: [
          { name: "title", weight: 0.6 },
          { name: "url", weight: 0.4 },
        ],
        threshold: 0.4,
        distance: 100,
        minMatchCharLength: 1,
      }),
    [history],
  );

  const actions = useMemo<SpotlightAction[]>(() => {
    const queryText = normalizedQuery.toLowerCase();
    const matchingTabs = (queryText ? fuseTabs.search(queryText).map((r) => r.item) : tabs)
      .slice(0, 6)
      .map((tab, index) => ({
        id: `tab:${tab.id}`,
        kind: "tab" as const,
        label: tab.title || tab.url || "New tab",
        description: tab.url || "Switch to tab",
        score: queryText ? Math.max(90 - index, 1) : 100 - index,
        onSelect: () => {
          window.api.EMIT("OPEN_TAB_BY_ID", { id: tab.id });
          closeSpotlight();
        },
      }));

    const historyEntries = (queryText ? fuseHistory.search(queryText).map((r) => r.item) : history)
      .slice(0, 5)
      .map((entry, index) => ({
        id: `history:${entry.id}`,
        kind: "history" as const,
        label: entry.title || entry.url,
        description: entry.url,
        score: queryText ? Math.max(80 - index * 2, 1) : 0,
        onSelect: () => {
          window.api
            .INVOKE<{ id: string }>("CREATE_TAB", { url: entry.url })
            // @ts-ignore
            .finally(closeSpotlight);
        },
      }));

    const extraActions: SpotlightAction[] = [];

    if (normalizedQuery) {
      const isDomain = isValidDomainOrIP(normalizedQuery);

      if (isDomain) {
        const url = navigateOrSearch(normalizedQuery);
        extraActions.push({
          id: `goto:${normalizedQuery}`,
          kind: "create" as const,
          label: `Go to "${normalizedQuery}"`,
          description: "Navigate current tab",
          score: 95,
          onSelect: () => {
            navigateCurrentTab(url as string);
            closeSpotlight();
          },
        });
        extraActions.push({
          id: `open-new-tab:${normalizedQuery}`,
          kind: "create" as const,
          label: `Open "${normalizedQuery}" in a new tab`,
          description: "Open the typed address in a fresh tab",
          score: 85,
          onSelect: () => {
            window.api
              .INVOKE<{ id: string }>("CREATE_TAB", { url })
              // @ts-ignore
              .finally(closeSpotlight);
          },
        });
      }

      extraActions.push({
        id: `search:${normalizedQuery}`,
        kind: "search" as const,
        label: `Search for "${normalizedQuery}"`,
        description: isDomain ? "Search for this text" : "Navigate current tab to search results",
        score: isDomain ? 60 : 70,
        onSelect: () => {
          const url = `https://google.com/search?q=${encodeURIComponent(normalizedQuery)}`;
          navigateCurrentTab(url);
          closeSpotlight();
        },
      });

      if (!isDomain) {
        const searchUrl = `https://google.com/search?q=${encodeURIComponent(normalizedQuery)}`;
        extraActions.push({
          id: `search-new-tab:${normalizedQuery}`,
          kind: "create" as const,
          label: `Search "${normalizedQuery}" in a new tab`,
          description: "Open search results in a fresh tab",
          score: 55,
          onSelect: () => {
            window.api
              .INVOKE<{ id: string }>("CREATE_TAB", { url: searchUrl })
              // @ts-ignore
              .finally(closeSpotlight);
          },
        });
      }

      extraActions.push({
        id: "create:new-tab",
        kind: "create" as const,
        label: "Create new tab",
        description: "Open a blank tab",
        score: 40,
        onSelect: () => {
          // @ts-ignore
          window.api.INVOKE<{ id: string }>("CREATE_TAB").finally(closeSpotlight);
        },
      });
    } else {
      extraActions.push({
        id: "create:new-tab",
        kind: "create" as const,
        label: "Create new tab",
        description: "Open a fresh tab",
        score: 110,
        onSelect: () => {
          // @ts-ignore
          window.api.INVOKE<{ id: string }>("CREATE_TAB").finally(closeSpotlight);
        },
      });
    }

    return [...matchingTabs, ...historyEntries, ...extraActions].sort((a, b) => b.score - a.score);
  }, [normalizedQuery, tabs, history, activeTabId]);

  useEffect(() => {
    if (activeIndex >= actions.length) {
      setActiveIndex(Math.max(actions.length - 1, 0));
    }
  }, [actions.length, activeIndex]);

  useEffect(() => {
    if (!normalizedQuery) return;
    setActiveIndex(0);
  }, [normalizedQuery]);

  useEffect(() => {
    if (listRef.current && actions[activeIndex]) {
      const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, actions.length]);

  const onSubmit = () => {
    if (actions[activeIndex]) {
      actions[activeIndex].onSelect();
      return;
    }
    if (normalizedQuery) {
      const url = navigateOrSearch(normalizedQuery);
      navigateCurrentTab(url as string);
    } else {
      window.api.INVOKE<{ id: string }>("CREATE_TAB");
    }
    closeSpotlight();
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-999 flex items-start justify-center pt-16 md:pt-24 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeSpotlight();
      }}
    >
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md" onClick={closeSpotlight} />

      <div className="relative w-full max-w-2xl mx-4 animate-slide-down">
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-slate-950/95 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_40px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <div className="flex items-center gap-3 border-b border-white/6 px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-400/20">
              <IconSwitchHorizontal size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-semibold tracking-wide text-white/90">Search</span>
                <span className="rounded-md border border-white/8 bg-white/4 px-2 py-0.5 text-[11px] font-medium tracking-wide text-white/40">
                  {hasTabs ? `${tabs.length} tab${tabs.length !== 1 ? "s" : ""}` : "Ready"}
                </span>
              </div>
              <p className="mt-0.5 text-[13px] leading-tight text-white/30">
                Search tabs, open URLs, or create a new tab
              </p>
            </div>
            <button
              type="button"
              onClick={closeSpotlight}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/30 transition-all hover:bg-white/6 hover:text-white/70"
              title="Close (Esc)"
            >
              <IconX size={16} />
            </button>
          </div>

          <div className="border-b border-white/6 px-4 py-3">
            <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/4 px-4 py-2.5 transition-all focus-within:border-indigo-400/30 focus-within:bg-indigo-500/5 focus-within:ring-1 focus-within:ring-indigo-400/20">
              <IconSearch size={17} className="shrink-0 text-white/30" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    closeSpotlight();
                    return;
                  }
                  if (event.key === "ArrowDown" && actions.length) {
                    event.preventDefault();
                    setActiveIndex((current) => (current + 1) % actions.length);
                    return;
                  }
                  if (event.key === "ArrowUp" && actions.length) {
                    event.preventDefault();
                    setActiveIndex((current) => (current - 1 + actions.length) % actions.length);
                    return;
                  }
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSubmit();
                  }
                }}
                placeholder="Search tabs, open URLs, or create a new tab..."
                className="min-w-0 flex-1 bg-transparent text-[15px] text-white/90 outline-none placeholder:text-white/25"
              />
              <div className="hidden items-center gap-1.5 md:flex">
                <kbd className="rounded-md border border-white/8 bg-white/4 px-2 py-0.5 text-[11px] font-medium text-white/50">
                  {navigator.platform.includes("Mac") ? "⌘ + K" : "Ctrl + K"}
                </kbd>
              </div>
            </div>
          </div>

          <div ref={listRef} className="max-h-[50vh] overflow-y-auto overscroll-contain py-1.5 scrollbar-thin">
            {actions.length > 0 ? (
              actions.map((action, index) => {
                const active = index === activeIndex;
                return (
                  <button
                    type="button"
                    key={action.id}
                    className={clsx(
                      "group relative mx-2 flex w-[calc(100%-16px)] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150",
                      active ? "bg-indigo-500/12 text-white" : "text-white/70 hover:bg-white/4 hover:text-white/90",
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={action.onSelect}
                  >
                    {active && <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-indigo-400/25" />}
                    <div
                      className={clsx(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 transition-all duration-150",
                        action.kind === "tab"
                          ? "bg-white/6 ring-white/8 text-white/60 group-hover:text-white/80"
                          : action.kind === "search"
                            ? "bg-emerald-500/10 ring-emerald-400/20 text-emerald-400/80"
                            : action.kind === "history"
                              ? "bg-amber-500/10 ring-amber-400/20 text-amber-400/80"
                              : "bg-indigo-500/10 ring-indigo-400/20 text-indigo-400/80",
                      )}
                    >
                      {action.kind === "tab" ? (
                        <IconSwitchHorizontal size={16} />
                      ) : action.kind === "search" ? (
                        <IconSearch size={16} />
                      ) : action.kind === "history" ? (
                        <IconClock size={16} />
                      ) : (
                        <IconPlus size={16} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium leading-snug">
                        {action.kind === "tab" && (
                          <span className="mr-1.5 inline-block rounded bg-white/6 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                            Tab
                          </span>
                        )}
                        {action.label}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] text-white/35">
                        {action.kind === "tab" && <IconWorld size={12} className="shrink-0" />}
                        {action.description}
                      </div>
                    </div>
                    <IconArrowRight
                      size={15}
                      className={clsx(
                        "shrink-0 transition-all duration-150",
                        active
                          ? "translate-x-0 text-indigo-400/60"
                          : "-translate-x-1 text-white/20 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
                      )}
                    />
                  </button>
                );
              })
            ) : (
              <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/4 ring-1 ring-white/6">
                  <IconSearch size={20} className="text-white/20" />
                </div>
                <p className="text-sm text-white/30">{normalizedQuery ? "No matching tabs" : "No open tabs yet"}</p>
                <p className="text-xs text-white/20">
                  {normalizedQuery
                    ? "Try a different search or create a new tab"
                    : "Open a tab to see it here, or create a new one"}
                </p>
              </div>
            )}
          </div>

          {actions.length > 0 && (
            <div className="flex items-center justify-between border-t border-white/6  px-5 py-2.5">
              <div className="flex items-center gap-3 text-[11px] text-white/50">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-white/8 bg-white/4 px-1.5 py-0.5 font-medium">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-white/8 bg-white/4 px-1.5 py-0.5 font-medium">Enter</kbd>
                  Select
                </span>
              </div>
              <span className="text-[11px] text-white/20">
                {activeIndex + 1} / {actions.length}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpotlightApp;
