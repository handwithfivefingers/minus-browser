import fs from "node:fs/promises";
import { v7 as uuid_v7 } from "uuid";
import { StoreManager } from "../../browsers/stores";
import { IUserScript, IUserScriptStore } from "../interfaces/userscript";
import { isUrlMatchedByPatterns, parseUserScriptMeta } from "../utils/parser";

export class UserScriptController {
  private store: StoreManager = new StoreManager("userscripts");
  private scripts: Map<string, IUserScript> = new Map();

  async initialize() {
    const raw = await this.store.readFiles<IUserScriptStore>();
    const scripts = Array.isArray(raw?.scripts) ? raw.scripts : [];
    this.scripts = new Map(scripts.filter((script) => script?.id).map((script) => [script.id, script]));
  }

  private persist() {
    return this.store.saveFiles({ scripts: this.listScripts() });
  }

  listScripts() {
    return [...this.scripts.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async saveScript({
    id,
    source,
    enabled,
  }: {
    id?: string;
    source: string;
    enabled?: boolean;
  }) {
    const now = Date.now();
    const parsed = parseUserScriptMeta(source);
    const current = id ? this.scripts.get(id) : null;

    const script: IUserScript = {
      id: current?.id || uuid_v7(),
      name: parsed.name,
      source,
      matches: parsed.matches,
      excludes: parsed.excludes,
      runAt: parsed.runAt,
      enabled: enabled ?? current?.enabled ?? false,
      createdAt: current?.createdAt || now,
      updatedAt: now,
    };

    this.scripts.set(script.id, script);
    await this.persist();
    return script;
  }

  async importScriptFromFile(filePath: string) {
    const source = await fs.readFile(filePath, "utf-8");
    return this.saveScript({ source, enabled: false });
  }

  async deleteScript(id: string) {
    this.scripts.delete(id);
    await this.persist();
    return true;
  }

  async toggleScript(id: string, enabled?: boolean) {
    const script = this.scripts.get(id);
    if (!script) return null;
    script.enabled = typeof enabled === "boolean" ? enabled : !script.enabled;
    script.updatedAt = Date.now();
    this.scripts.set(id, script);
    await this.persist();
    return script;
  }

  getScriptsForURL(url: string) {
    return this.listScripts().filter((script) => {
      if (!script.enabled) return false;
      const isMatched = isUrlMatchedByPatterns(url, script.matches);
      if (!isMatched) return false;
      const isExcluded = isUrlMatchedByPatterns(url, script.excludes);
      return !isExcluded;
    });
  }
}
