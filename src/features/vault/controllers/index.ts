import { eventStore } from "~/features/system/stores/minusEventEmitter";
import { VaultServices } from "../services";
import { Vault } from "../types";
import { IPasswordItem } from "../types/password";
import { PasswordController } from "./passwordController";
import { Notification, WebContentsView } from "electron";

export class VaultController {
  private passwordController: PasswordController = new PasswordController();
  private vaultService = new VaultServices();

  activeView: WebContentsView | null = null;
  constructor() {
    eventStore.listen("viewChanges", (view: WebContentsView) => {
      this.activeView = view;
    });
  }

  async getVaults() {
    try {
      return await this.passwordController.list();
    } catch (error) {
      console.log("error", error);
      return [];
    }
  }

  getVaultById(id: string) {
    return this.passwordController.getById(id);
  }

  async addVault(data: Vault) {
    if (!data?.site?.trim()) {
      throw new Error("Site is required");
    }
    if (!data?.username?.trim()) {
      throw new Error("Username is required");
    }
    if (!data?.password?.trim()) {
      throw new Error("Password is required");
    }

    return this.passwordController.add({
      site: data.site.trim(),
      username: data.username.trim(),
      password: data.password,
      notes: data.notes || "",
    });
  }

  async updateVault(id: string, patch: Partial<Pick<IPasswordItem, "site" | "username" | "password" | "notes">>) {
    return this.passwordController.update(id, patch);
  }

  async removeVault(id: string) {
    return this.passwordController.remove(id);
  }

  async openManager(tabId: string) {
    try {
      if (this.activeView) {
        const vaultList = await this.getVaults();
        const newVaults: IPasswordItem[] | null = await this.vaultService.openManager(this.activeView, vaultList);
        console.log("newVaults", newVaults, Array.isArray(newVaults));
        if (Array.isArray(newVaults)) {
          for (let vault of newVaults) {
            console.log("vault", vault);
            await this.passwordController.update(vault.id, vault);
          }
        }
        return new Notification({
          title: "Vault Manager",
          body: "Vault Manager updated",
        }).show();
      }
      return false;
    } catch (error) {
      console.log("Open Manager error", error);
    }
  }

  async fill(data: { credentialId: string }) {
    if (!this.activeView || !data?.credentialId) return;
    const credential = this.getVaultById(data.credentialId);
    if (!credential) return;
    return this.activeView.webContents.executeJavaScript(this.getDialogScriptInjection(credential), true);
  }

  getDialogScriptInjection(credential: { username: string; password: string }) {
    return `(() => {
      const emit = (element) => {
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
      };
      const creds = ${JSON.stringify({
        username: "",
        password: "",
      })};
      creds.username = ${JSON.stringify(credential.username)};
      creds.password = ${JSON.stringify(credential.password)};

      const passwordInputs = Array.from(document.querySelectorAll('input[type="password"]'));
      const usernameSelectors = [
        'input[type="email"]',
        'input[name*="user" i]',
        'input[name*="email" i]',
        'input[id*="user" i]',
        'input[id*="email" i]',
        'input[type="text"]'
      ];
      const userInput = usernameSelectors
        .map((selector) => document.querySelector(selector))
        .find(Boolean);

      if (userInput) {
        userInput.focus();
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set?.call(userInput, creds.username);
        const event = new Event('change', { bubbles: true });
        userInput.dispatchEvent(event);
        emit(userInput);
      }
      if (passwordInputs.length > 0) {
        const target = passwordInputs[0];
        target.focus();
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set?.call(target, creds.password);
        const event = new Event('change', { bubbles: true });
        target.dispatchEvent(event);
        emit(target);
      }
      return {
        filledUsername: Boolean(userInput),
        filledPassword: passwordInputs.length > 0
      };
    })();`;
  }

  vaultConfirmSave(data: { username: string; site: string }) {
    if (this.activeView) {
      return this.vaultService.confirmSave(this.activeView.webContents, {
        username: data.username,
        site: data.site,
      });
    }
    // if (!data?.tabId) throw new Error("Tab id is required");
    //   const tab = this.tabController?.getTabById(data.tabId);
    //   if (!tab) throw new Error("Tab not found");
    //   return this.vaultServices.confirmSave(tab.webContents, {
    //     username: data.username,
    //     site: data.site,
    //   });
  }

  async vaultSelectCredential(data: { candidates: IPasswordItem[] }) {
    if (!this.activeView) return null;
    return this.vaultService.selectCredential(this.activeView.webContents, data.candidates || []);
  }
}
