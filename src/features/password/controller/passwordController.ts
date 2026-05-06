import { safeStorage } from "electron";
import { v7 as uuid_v7 } from "uuid";
import { StoreManager } from "../../system/stores";
import { IPasswordItem, IPasswordVaultPayload } from "../interfaces/password";

interface IPasswordStore {
  vault: IPasswordVaultPayload;
}

export class PasswordController {
  private store: StoreManager = new StoreManager("passwordVault");
  private items: Map<string, IPasswordItem> = new Map();

  async initialize() {
    const raw = await this.store.readFiles<IPasswordStore>();
    const payload = raw?.vault;
    if (!payload?.cipherText) {
      this.items = new Map();
      return;
    }
    const decrypted = this.decrypt(payload);
    const parsed = JSON.parse(decrypted || "[]");
    const list = Array.isArray(parsed) ? parsed : [];
    this.items = new Map(
      list.filter((item) => item?.id).map((item) => [item.id, item]),
    );
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
    const data = JSON.stringify(this.list());
    const vault = this.encrypt(data);
    await this.store.saveFiles({ vault });
  }

  list() {
    return [...this.items.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getById(id: string) {
    return this.items.get(id) || null;
  }

  async add(input: {
    site: string;
    username: string;
    password: string;
    notes?: string;
  }) {
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

  async update(
    id: string,
    patch: Partial<Pick<IPasswordItem, "site" | "username" | "password" | "notes">>,
  ) {
    const current = this.items.get(id);
    if (!current) return null;
    const next: IPasswordItem = {
      ...current,
      ...patch,
      updatedAt: Date.now(),
    };
    this.items.set(id, next);
    await this.persist();
    return next;
  }

  async remove(id: string) {
    const deleted = this.items.delete(id);
    await this.persist();
    return deleted;
  }
}
