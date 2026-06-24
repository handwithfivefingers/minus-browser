import fs from "node:fs/promises";
import { v7 as uuid_v7 } from "uuid";
import { StoreManager } from "~/core/stores";
import { IUserScript, IUserScriptStore } from "../types";
import { UserScript } from "../models/userScript";
import { isUrlMatchedByPatterns } from "~/shared/utils";
import { cacheSystem } from "~/features/cacheSystem";
import { UserScriptService } from "../services";
import { eventStore } from "~/core/stores";
import { WebContentsView } from "electron";
import { SkipADSBlock, SponsorBlock } from "~/features/adblocker/scripts";

const BUILT_IN_SCRIPTS: IUserScript[] = [
  {
    id: "builtin-skip-adsblock",
    name: "YouTube Ad Skip",
    source: `if (!window.__ytAdblockInjected) { (${SkipADSBlock.toString()})(); }`,
    matches: ["*://*.youtube.com/*"],
    excludes: [],
    runAt: "document-end",
    enabled: true,
    builtIn: true,
  },
  {
    id: "builtin-sponsorblock",
    name: "SponsorBlock",
    source: `if (!window.__ytAdblockInjected) { (${SponsorBlock.toString()})(); }`,
    matches: ["*://*.youtube.com/*"],
    excludes: [],
    runAt: "document-end",
    enabled: true,
    builtIn: true,
  },
];

export class UserScriptController {
  private store: StoreManager = new StoreManager("userscripts");
  private scripts: Map<string, UserScript> = new Map();
  private initialized = false;
  private initializing?: Promise<void>;
  activeTab: WebContentsView | null = null;
  private disabledBuiltIns: Set<string> = new Set();
  constructor(private service: UserScriptService = new UserScriptService()) {
    eventStore.listen("viewChanges", (view: WebContentsView) => {
      this.activeTab = view;
    });
  }

  disableBuiltIn(id: string) {
    this.disabledBuiltIns.add(id);
  }

  enableBuiltIn(id: string) {
    this.disabledBuiltIns.delete(id);
  }

  setBuiltInEnabled(id: string, enabled: boolean) {
    if (enabled) this.enableBuiltIn(id);
    else this.disableBuiltIn(id);
  }
  async initialize() {
    if (this.initialized) return;
    if (this.initializing) return this.initializing;
    this.initializing = this.load();
    return this.initializing;
  }

  private async load() {
    const callback = () => this.store.readFiles<IUserScriptStore>();
    const raw = await cacheSystem.get<IUserScriptStore>("userscripts", callback);
    const storedScripts = Array.isArray(raw?.scripts) ? raw.scripts : [];
    const storedMap = new Map(storedScripts.filter((s) => s?.id).map((s) => [s.id, s]));

    // Load built-in scripts from code, preserving toggle state from storage
    this.scripts = new Map();
    for (const builtIn of BUILT_IN_SCRIPTS) {
      const stored = storedMap.get(builtIn.id);
      this.scripts.set(
        builtIn.id,
        new UserScript({ ...builtIn, enabled: stored ? stored.enabled : builtIn.enabled }),
      );
    }

    // Load user scripts from storage
    for (const [id, s] of storedMap) {
      if (BUILT_IN_SCRIPTS.some((b) => b.id === id)) continue;
      this.scripts.set(id, new UserScript(s));
    }

    this.initialized = true;
  }

  private persist() {
    const allScripts = [...this.scripts.values()].map((script) => script.toJSON());
    cacheSystem.set("userscripts", { scripts: allScripts });
    return this.store.saveFiles({ scripts: allScripts });
  }

  listScripts() {
    return [...this.scripts.values()].map((script) => script.toJSON());
  }

  async saveScript({ id, ...data }: IUserScript) {
    await this.initialize();
    if (!data?.source?.trim()) {
      throw new Error("Script source is required");
    }
    const now = Date.now();
    const current = id ? this.scripts.get(id) : undefined;

    // For built-in scripts, only toggle the enabled state
    if (current?.builtIn) {
      current.enabled = typeof data.enabled === "boolean" ? data.enabled : current.enabled;
      current.updatedAt = Date.now();
      this.scripts.set(current.id, current);
      this.persist();
      return current;
    }

    const script: UserScript = new UserScript({
      id: current?.id || uuid_v7(),
      ...data,
      createdAt: current?.createdAt || now,
    });

    this.scripts.set(script.id, script);
    this.persist();
    return script;
  }

  async importScriptFromFile(filePath: string) {
    await this.initialize();
    const source = await fs.readFile(filePath, "utf-8");
    return this.saveScript(
      new UserScript({
        source,
        enabled: false,
        name: `ImportScript-${Date.now()}`,
        id: uuid_v7(),
        matches: ["*"],
        runAt: "document-start",
      }),
    );
  }

  async deleteScript(id: string) {
    await this.initialize();
    const script = this.scripts.get(id);
    if (script?.builtIn) {
      throw new Error("Cannot delete built-in scripts");
    }
    this.scripts.delete(id);
    this.persist();
    return true;
  }

  async toggleScript(id: string, enabled?: boolean) {
    await this.initialize();
    const script = this.scripts.get(id);
    if (!script) return null;
    script.enabled = typeof enabled === "boolean" ? enabled : !script.enabled;
    script.updatedAt = Date.now();
    this.scripts.set(id, script);
    this.persist();
    return script;
  }

  async getScriptsForURL(url: string) {
    await this.initialize();
    return this.listScripts().filter((script) => {
      if (!script.enabled) return false;
      if (script.builtIn && this.disabledBuiltIns.has(script.id)) return false;
      const isMatched = isUrlMatchedByPatterns(url, script.matches);
      if (!isMatched) return false;
      const isExcluded = script.excludes?.length ? isUrlMatchedByPatterns(url, script.excludes) : false;
      return !isExcluded;
    });
  }
  async openManager() {
    await this.initialize();
    if (!this.activeTab) return;
    const scripts = this.listScripts();
    const results = await this.service.openManager(this.activeTab, scripts);
    let newScripts = Array.isArray(results) ? results : [];
    if (newScripts.length) {
      newScripts = newScripts.filter((script) => script?.id);
      // Keep built-in scripts, update only their enabled state from manager results
      const builtIn = [...this.scripts.entries()].filter(([, s]) => s.builtIn);
      this.scripts = new Map(builtIn);
      for (const s of newScripts) {
        if (s.builtIn) {
          const existing = this.scripts.get(s.id);
          if (existing) {
            existing.enabled = typeof s.enabled === "boolean" ? s.enabled : existing.enabled;
          }
        } else {
          this.scripts.set(s.id, new UserScript(s));
        }
      }
      this.persist();
    }
  }
}

export const userScriptController = new UserScriptController();
