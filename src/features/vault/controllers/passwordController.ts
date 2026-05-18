import { safeStorage } from "electron";
import { v7 as uuid_v7 } from "uuid";
import { IPasswordItem, IPasswordVaultPayload } from "../types/password";
import { StoreManager } from "~/features/system";
import { cacheSystem } from "~/features/cacheSystem";

interface IPasswordStore {
  vault: IPasswordVaultPayload;
}

export class PasswordController {
  private store: StoreManager = new StoreManager("passwordVault");
  private items: Map<string, IPasswordItem> = new Map();
  async initialize() {
    try {
      const cb = () => this.store.readFiles<IPasswordStore>();
      const vaults = await cacheSystem.get<IPasswordStore>("passwordVault", cb);
      console.log("vaults", vaults);
      const payload = vaults?.vault;
      if (!payload?.cipherText) {
        this.items = new Map();
        return;
      }
      const decrypted = this.decrypt(payload);
      const parsed = JSON.parse(decrypted || "[]");
      const list = Array.isArray(parsed) ? parsed : [];
      const items = new Map(list.filter((item) => item?.id).map((item) => [item.id, item]));
      this.items = items;
    } catch (error) {
      console.log("failed to init", error);
    }
  }

  private encrypt(text: string): IPasswordVaultPayload {
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = safeStorage.encryptString(text);
      return { cipherText: buffer.toString("base64"), isEncrypted: true };
    }
    return {
      cipherText: Buffer.from(text, "utf-8").toString("base64"),
      isEncrypted: false,
    };
  }

  private decrypt(payload: IPasswordVaultPayload): string {
    if (!payload?.cipherText) return "[]";
    const cipher = Buffer.from(payload.cipherText, "base64");
    if (payload.isEncrypted && safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(cipher);
    }
    return cipher.toString("utf-8");
  }

  private async persist() {
    try {
      const items = await this.list();
      const data = JSON.stringify(items);
      const vault = this.encrypt(data);
      cacheSystem.set("passwordVault", items);
      await this.store.saveFiles({ vault });
    } catch (error) {
      console.log("persit vault error", error);
    }
  }

  async list() {
    await this.initialize();
    return [...this.items.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getById(id: string) {
    return this.items.get(id) || null;
  }

  async add(input: Pick<IPasswordItem, "site" | "username" | "password" | "notes">) {
    const now = Date.now();
    const item: IPasswordItem = {
      id: uuid_v7(),
      site: input.site,
      username: input.username,
      password: input.password,
      notes: input.notes || "",
      createdAt: now,
      updatedAt: now,
    };
    this.items.set(item.id, item);
    await this.persist();
    return item;
  }

  async update(id: string, patch: Partial<Pick<IPasswordItem, "site" | "username" | "password" | "notes">>) {
    try {
      const current = this.items.get(id);
      if (!current) return this.add(patch as IPasswordItem);
      const next: IPasswordItem = {
        ...current,
        ...patch,
        updatedAt: Date.now(),
      };
      this.items.set(id, next);
      await this.persist();
      return next;
    } catch (error) {
      console.log("update Vault Password ", error);
    }
  }

  async remove(id: string) {
    this.items.delete(id);
    await this.persist();
    return true;
  }
}
