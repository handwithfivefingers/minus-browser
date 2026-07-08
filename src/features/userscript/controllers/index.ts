import fs from "node:fs/promises";
import { v7 as uuid_v7 } from "uuid";
import { appDb } from "~/core/stores";
import { IUserScript } from "../types";
import { UserScript } from "../models/userScript";
import { isUrlMatchedByPatterns } from "~/shared/utils";
import { cacheSystem } from "~/features/cacheSystem";
import { UserScriptService } from "../services";
import { eventStore } from "~/core/stores";
import { WebContentsView } from "electron";

export class UserScriptController {
  private scripts: Map<string, UserScript> = new Map();
  private initialized = false;
  private initializing?: Promise<void>;
  activeTab: WebContentsView | null = null;

  constructor(private service: UserScriptService = new UserScriptService()) {
    eventStore.listen("viewChanges", (view: WebContentsView) => {
      this.activeTab = view;
    });
  }

  async initialize() {
    if (this.initialized) return;
    if (this.initializing) return this.initializing;
    this.initializing = this.load();
    return this.initializing;
  }

  private async load() {
    const callback = () => {
      const rows = appDb.query<IUserScript>(
        "SELECT id, name, source, enabled, matches, excludes, run_at as runAt, created_at as createdAt, updated_at as updatedAt FROM user_scripts",
      );
      return { scripts: rows.map((r) => ({
        ...r,
        enabled: !!r.enabled,
        matches: typeof r.matches === "string" ? JSON.parse(r.matches) : r.matches,
        excludes: typeof r.excludes === "string" ? JSON.parse(r.excludes || "[]") : (r.excludes || []),
      })) };
    };
    const raw = await cacheSystem.get<{ scripts: IUserScript[] }>("userscripts", callback);
    const storedScripts = Array.isArray(raw?.scripts) ? raw.scripts : [];

    this.scripts = new Map();
    for (const s of storedScripts) {
      if (s?.id) {
        this.scripts.set(s.id, new UserScript(s));
      }
    }

    this.initialized = true;
  }

  private persist() {
    const allScripts = [...this.scripts.values()].map((script) => script.toJSON());
    cacheSystem.set("userscripts", { scripts: allScripts });
    appDb.transaction(() => {
      appDb.run("DELETE FROM user_scripts");
      for (const s of allScripts) {
        appDb.run(
          "INSERT INTO user_scripts (id, name, source, enabled, matches, excludes, run_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [s.id, s.name, s.source, s.enabled ? 1 : 0, JSON.stringify(s.matches || []), JSON.stringify(s.excludes || []), s.runAt, s.createdAt || Date.now(), s.updatedAt || Date.now()],
        );
      }
    });
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
      this.scripts = new Map();
      for (const s of newScripts) {
        this.scripts.set(s.id, new UserScript(s));
      }
      this.persist();
    }
  }
}

export const userScriptController = new UserScriptController();
