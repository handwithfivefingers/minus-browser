import { IPasswordItem } from "../../interfaces/password";
import { PasswordController } from "../../services/password.service";

export class VaultController {
  private passwordController: PasswordController;

  constructor(passwordController?: PasswordController) {
    this.passwordController = passwordController || new PasswordController();
  }

  async initialize() {
    await this.passwordController.initialize();
  }

  getVaults() {
    return this.passwordController.list();
  }

  getVaultById(id: string) {
    return this.passwordController.getById(id);
  }

  async addVault(data: { site: string; username: string; password: string; notes?: string }) {
    return this.passwordController.add(data);
  }

  async updateVault(id: string, patch: Partial<Pick<IPasswordItem, "site" | "username" | "password" | "notes">>) {
    return this.passwordController.update(id, patch);
  }

  async removeVault(id: string) {
    return this.passwordController.remove(id);
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
}
