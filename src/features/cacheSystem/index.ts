export type Collection = "tab" | "password" | "userscripts" | "passwordVault" | "translate" | "interface" | "session" | "tabGroups";

export class CacheSystem {
  private data: Record<Collection, any> = {
    tab: null,
    password: null,
    userscripts: null,
    passwordVault: null,
    translate: null,
    interface: null,
    session: null,
    tabGroups: null,
  };
  constructor() {}

  async get<T>(key: Collection, fallback?: () => any) {
    try {
      if (key in this.data && !!this.data[key]) {
        return this.data[key] as T;
      }
      if (typeof fallback === undefined) return undefined;
      const data = await fallback?.();
      this.set(key, data);
      return data as T;
    } catch (error) {
      console.error(`CacheSystem Get ${key} error`, error);
    }
  }

  set<T>(key: Collection, value: T) {
    this.data[key] = value;
  }

  delete(key: Collection) {
    if (key in this.data) {
      delete this.data[key];
    }
  }
}

export const cacheSystem = new CacheSystem();
