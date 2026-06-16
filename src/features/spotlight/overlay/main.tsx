import { IconArrowRight, IconPlus, IconSearch, IconSwitchHorizontal, IconX, IconWorld } from "@tabler/icons-react";
import clsx from "clsx";
import { createRoot } from "react-dom/client";
import { useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import { Tab } from "~/features/ui/interfaces";
import { isValidDomainOrIP, navigateOrSearch } from "../../ui/libs";
import "./assets/styles.css";

interface SpotlightProps {
  query: string;
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const hasTabs = tabs.length > 0;

  useEffect(() => {
    window.api.LISTENER("SPOTLIGHT_OPEN", (payload?: SpotlightProps) => {
      setQuery(payload?.query || "");
      setActiveIndex(0);
      setVisible(true);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    });

    window.api.LISTENER("SPOTLIGHT_CLOSE", () => {
      setVisible(false);
    });

    window.api.LISTENER("GET_TABS", (payload?: Tab[]) => {
      setTabs(payload || []);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeSpotlight();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        closeSpotlight();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const normalizedQuery = query.trim();

  const closeSpotlight = () => {
    setVisible(false);
    window.api.EMIT("SPOTLIGHT_CLOSE");
  };

  const fuse = useMemo(
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

  const actions = useMemo<SpotlightAction[]>(() => {
    const queryText = normalizedQuery.toLowerCase();
    const matchingTabs = (queryText ? fuse.search(queryText).map((r) => r.item) : tabs)
      .slice(0, 6)
      .map((tab, index) => ({
        id: `tab:${tab.id}`,
        kind: "tab" as const,
        label: tab.title || tab.url || "New tab",
        description: tab.url || "Switch to tab",
        score: queryText ? Math.max(100 - index, 1) : 100 - index,
        onSelect: () => {
          window.api.EMIT("OPEN_TAB_BY_ID", { id: tab.id });
          closeSpotlight();
        },
      }));

    const searchAction =
      normalizedQuery && !isValidDomainOrIP(normalizedQuery)
        ? [
            {
              id: `search:${normalizedQuery}`,
              kind: "search" as const,
              label: `Search for "${normalizedQuery}"`,
              description: "Open a new tab with web search results",
              score: 70,
              onSelect: () => {
                const url = `https://google.com/search?q=${encodeURIComponent(normalizedQuery)}`;
                window.api.INVOKE<{ id: string }>("CREATE_TAB", { url }).finally(closeSpotlight);
              },
            },
          ]
        : [];

    const createAction = normalizedQuery
      ? [
          {
            id: `create:${normalizedQuery}`,
            kind: "create" as const,
            label: isValidDomainOrIP(normalizedQuery) ? `Open "${normalizedQuery}"` : "Create new tab",
            description: isValidDomainOrIP(normalizedQuery)
              ? "Open the typed address in a fresh tab"
              : "Open a blank tab",
            score: isValidDomainOrIP(normalizedQuery) ? 95 : 40,
            onSelect: () => {
              const url = isValidDomainOrIP(normalizedQuery) ? navigateOrSearch(normalizedQuery) : undefined;
              window.api.INVOKE<{ id: string }>("CREATE_TAB", url ? { url } : undefined).finally(closeSpotlight);
            },
          },
        ]
      : [
          {
            id: "create:new-tab",
            kind: "create" as const,
            label: "Create new tab",
            description: "Open a fresh tab",
            score: 110,
            onSelect: () => {
              window.api.INVOKE<{ id: string }>("CREATE_TAB").finally(closeSpotlight);
            },
          },
        ];

    return [...matchingTabs, ...createAction, ...searchAction].sort((a, b) => b.score - a.score);
  }, [normalizedQuery, tabs]);

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
    const fallbackUrl = normalizedQuery ? navigateOrSearch(normalizedQuery) : undefined;
    window.api
      .INVOKE<{ id: string }>("CREATE_TAB", fallbackUrl ? { url: fallbackUrl } : undefined)
      .finally(closeSpotlight);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[2147483647] flex items-start justify-center pt-16 md:pt-24 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeSpotlight();
      }}
    >
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md" />

      <div className="relative w-full max-w-2xl mx-4 animate-slide-down">
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-950/95 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_40px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-400/20">
              <IconSwitchHorizontal size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-semibold tracking-wide text-white/90">Spotlight</span>
                <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium tracking-wide text-white/40">
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
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/30 transition-all hover:bg-white/[0.06] hover:text-white/70"
              title="Close (Esc)"
            >
              <IconX size={16} />
            </button>
          </div>

          <div className="border-b border-white/[0.06] px-4 py-3">
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 transition-all focus-within:border-indigo-400/30 focus-within:bg-indigo-500/5 focus-within:ring-1 focus-within:ring-indigo-400/20">
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
                <kbd className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-white/30">
                  {navigator.platform.includes("Mac") ? "⌘K" : "Ctrl+K"}
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
                      active
                        ? "bg-indigo-500/12 text-white"
                        : "text-white/70 hover:bg-white/[0.04] hover:text-white/90",
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={action.onSelect}
                  >
                    {active && <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-indigo-400/25" />}
                    <div
                      className={clsx(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 transition-all duration-150",
                        action.kind === "tab"
                          ? "bg-white/[0.06] ring-white/[0.08] text-white/60 group-hover:text-white/80"
                          : action.kind === "search"
                            ? "bg-emerald-500/10 ring-emerald-400/20 text-emerald-400/80"
                            : "bg-indigo-500/10 ring-indigo-400/20 text-indigo-400/80",
                      )}
                    >
                      {action.kind === "tab" ? (
                        <IconSwitchHorizontal size={16} />
                      ) : action.kind === "search" ? (
                        <IconSearch size={16} />
                      ) : (
                        <IconPlus size={16} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium leading-snug">
                        {action.kind === "tab" && (
                          <span className="mr-1.5 inline-block rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/30">
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
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04] ring-1 ring-white/[0.06]">
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
            <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-2.5">
              <div className="flex items-center gap-3 text-[11px] text-white/25">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-medium">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-medium">
                    Enter
                  </kbd>
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

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(<SpotlightApp />);
