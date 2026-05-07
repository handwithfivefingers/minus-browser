import { UserScriptController } from "../../controller/userScript";
import { IUserScript } from "../../interfaces/userscript";

export class UserScriptManagerController {
  private userScriptController: UserScriptController;

  constructor(userScriptController?: UserScriptController) {
    this.userScriptController = userScriptController || new UserScriptController();
  }

  async initialize() {
    await this.userScriptController.initialize();
  }

  getUserScripts() {
    return this.userScriptController.listScripts();
  }

  async saveUserScript(data: IUserScript) {
    return this.userScriptController.saveScript(data);
  }

  async importUserScript(filePath: string) {
    return this.userScriptController.importScriptFromFile(filePath);
  }

  async deleteUserScript(id: string) {
    return this.userScriptController.deleteScript(id);
  }

  async toggleUserScript(id: string, enabled?: boolean) {
    return this.userScriptController.toggleScript(id, enabled);
  }

  getScriptsForURL(url: string): IUserScript[] {
    return this.userScriptController.getScriptsForURL(url);
  }
}
