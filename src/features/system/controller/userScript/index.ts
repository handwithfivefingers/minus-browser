import fs from "node:fs/promises";
import { v7 as uuid_v7 } from "uuid";
import { StoreManager } from "../../stores";
import { UserScript } from "../../classes/userScript";
import { IUserScript, IUserScriptStore } from "../../interfaces/userscript";
import { isUrlMatchedByPatterns } from "../../utils/parser";

export class UserScriptController {
  private store: StoreManager = new StoreManager("userscripts");
  private scripts: Map<string, UserScript> = new Map();

  async initialize() {
    const raw = await this.store.readFiles<IUserScriptStore>();
    const scripts = Array.isArray(raw?.scripts) ? raw.scripts : [];
    this.scripts = new Map(scripts.filter((script) => script?.id).map((script) => [script.id, new UserScript(script)]));
  }

  private persist() {
    return this.store.saveFiles({ scripts: this.listScripts() });
  }

  listScripts() {
    return [...this.scripts.values()].map((script) => script.toJSON());
  }

  async saveScript({ id, ...data }: IUserScript) {
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
    this.scripts.delete(id);
    this.persist();
    return true;
  }

  async toggleScript(id: string, enabled?: boolean) {
    const script = this.scripts.get(id);
    if (!script) return null;
    script.enabled = typeof enabled === "boolean" ? enabled : !script.enabled;
    script.updatedAt = Date.now();
    this.scripts.set(id, script);
    this.persist();
    return script;
  }

  getScriptsForURL(url: string) {
    return this.listScripts().filter((script) => {
      if (!script.enabled) return false;
      const isMatched = isUrlMatchedByPatterns(url, script.matches);
      // if (!isMatched) return false;
      // const isExcluded = isUrlMatchedByPatterns(url, script.excludes);
      // console.log("isExcluded", isExcluded);
      // return !isExcluded;
      return isMatched;
    });
  }
}
