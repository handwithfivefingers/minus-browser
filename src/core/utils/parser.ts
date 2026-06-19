import { UserScriptRunAt } from "~/core/interfaces";

const DEFAULT_SCRIPT_NAME = "Custom Script";

const WILDCARD_TO_REGEX = /[.+?^${}()|[\]\\]/g;

const escapeRegex = (input: string) => input.replace(WILDCARD_TO_REGEX, "\\$&").replace(/\*/g, ".*");

export const parseUserScriptMeta = (source: string) => {
  const block = source.match(/\/\/\s*==UserScript==([\s\S]*?)\/\/\s*==\/UserScript==/m);
  const lines = block?.[1]?.split("\n") || [];
  const meta: {
    name?: string;
    match: string[];
    exclude: string[];
    runAt: UserScriptRunAt;
  } = {
    match: [],
    exclude: [],
    runAt: "document-start",
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const parsed = line.match(/^\/\/\s*@([a-zA-Z-]+)\s+(.+)$/);
    if (!parsed) continue;
    const [, key, value] = parsed;
    if (key === "name" && !meta.name) {
      meta.name = value.trim();
      continue;
    }
    if (key === "match") {
      meta.match.push(value.trim());
      continue;
    }
    if (key === "exclude") {
      meta.exclude.push(value.trim());
      continue;
    }
    if (
      key === "run-at" &&
      (value.trim() === "document-start" || value.trim() === "document-end" || value.trim() === "document-idle")
    ) {
      meta.runAt = (value.trim() as UserScriptRunAt) || "document-start";
    }
  }

  return {
    name: meta.name || DEFAULT_SCRIPT_NAME,
    matches: meta.match,
    excludes: meta.exclude,
    runAt: meta.runAt || "document-end",
  };
};

const patternToRegex = (pattern: string) => {
  const normalized = pattern.trim();
  if (!normalized || normalized === "*") return /^https?:\/\/.+/i;
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return new RegExp(`^${escapeRegex(normalized)}$`, "i");
  }
  if (normalized.startsWith("*://")) {
    const replaced = normalized.replace("*://", "https?://");
    return new RegExp(`^${escapeRegex(replaced)}$`, "i");
  }
  return new RegExp(`^${escapeRegex(normalized)}$`, "i");
};

export const isUrlMatchedByPatterns = (url: string, patterns: string[]) => {
  if (!patterns.length) return true;
  return patterns.some((pattern) => {
    try {
      return patternToRegex(pattern).test(url);
    } catch (error) {
      return false;
    }
  });
};

export const isSameURl = (url1: string, url2: string) => {
  try {
    const parsedUrl1 = new URL(url1);
    const parsedUrl2 = new URL(url2);
    const isSameOrigin = parsedUrl1.origin === parsedUrl2.origin;
    const isSameHref = parsedUrl1.href === parsedUrl2.href;
    return isSameOrigin && isSameHref;
  } catch (error) {
    return false;
  }
};
