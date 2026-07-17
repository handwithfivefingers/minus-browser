import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "auto";
type ResolvedTheme = "light" | "dark";

let cachedMode: ThemeMode | null = null;

function resolve(mode: ThemeMode): ResolvedTheme {
  if (mode === "auto") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

type ApiTheme = { mode?: string };

function applyMode(mode: ThemeMode) {
  const r = resolve(mode);
  document.documentElement.classList.toggle("dark", r === "dark");
}

export async function initTheme() {
  const theme = await (window.api.INVOKE("GET_USER_INTERFACE") as Promise<ApiTheme>);
  cachedMode = (theme?.mode as ThemeMode) || "auto";
  applyMode(cachedMode);

  window.api.LISTENER?.("THEME_MODE_CHANGED", (data: { mode: string }) => {
    cachedMode = data.mode as ThemeMode;
    applyMode(cachedMode);
  });

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (cachedMode === "auto") applyMode("auto");
  });
}

export function useTheme() {
  const [resolved, setResolved] = useState<ResolvedTheme>("dark");

  useEffect(() => {
    async function load() {
      const theme = await (window.api.INVOKE("GET_USER_INTERFACE") as Promise<ApiTheme>);
      cachedMode = (theme?.mode as ThemeMode) || "auto";
      const r = resolve(cachedMode);
      document.documentElement.classList.toggle("dark", r === "dark");
      setResolved(r);
    }
    load();

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (cachedMode === "auto") {
        const r = resolve("auto");
        document.documentElement.classList.toggle("dark", r === "dark");
        setResolved(r);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return resolved;
}
