import { app, BrowserWindow, dialog, ipcMain, Notification, session, WebContentsView } from "electron";
import log from "electron-log";
import { IHandleResizeView, IPC, ITab } from "../interfaces";
import { IPasswordItem } from "../../password";
import { ErrorServices } from "../services/error.services";
import { StoreManager } from "../stores";
import { isSameURl } from "../utils";
import { IPC_EMIT_CHANNEL, IPC_INVOKE_CHANNEL } from "../constants/ipc";
import { TabController } from "./tab";
import { Tab } from "../classes/tab";
import { VaultController } from "./vault";
import { VaultServices } from "../services/vault.service";
import { UserScriptManagerController } from "../services/userScript.service/manger";
import { UserScriptDialogServices } from "../services/userScript.service/dialog";
import { IUserScript } from "../interfaces/userscript";
import { TranslateController } from "./translate";
interface IUserInterface {
  layout: string;
  mode: string;
  dataSync: {
    intervalTime: string;
    hardwareAcceleration: string;
  };
}
export class ViewController {
  window: BrowserWindow;
  wc: Electron.WebContents | undefined;
  userStore: StoreManager = new StoreManager("userData");
  interfaceStore: StoreManager = new StoreManager("interface");
  minusSession: Electron.Session | undefined = session.fromPartition("persist:minus-browser");
  tabController = new TabController();
  vaultController = new VaultController();
  vaultServices = new VaultServices();
  translateController = new TranslateController();
  userScriptManagerController = new UserScriptManagerController(this.tabController.userScripts);
  userScriptDialogController = new UserScriptDialogServices();

  private invokeHandlers: Record<string, (data?: any) => any> | undefined;
  private listenerHandlers: Record<string, (data?: any) => void> | undefined;

  constructor(window: BrowserWindow) {
    this.window = window;
    this.init();
  }

  private async initializeHandlers() {
    try {
      this.invokeHandlers = {
        [IPC_INVOKE_CHANNEL.GET_TABS]: () => this.getTabs(),
        [IPC_INVOKE_CHANNEL.CREATE_TAB]: (tab?: Partial<ITab>) => this.createTab(tab),
        [IPC_INVOKE_CHANNEL.GET_TAB]: (tab?: Partial<ITab>) => this.getTab({ id: tab?.id as string }),
        [IPC_INVOKE_CHANNEL.GET_USER_INTERFACE]: () => this.loadUserInterface(),
        [IPC_INVOKE_CHANNEL.CLOUD_SAVE]: () => this.persist(),
        [IPC_INVOKE_CHANNEL.SEARCH_PAGE]: (data) => this.handleSearchPage(data),
        [IPC_INVOKE_CHANNEL.INTERFACE_SAVE]: (data) => this.interfaceSave(data),
        [IPC_INVOKE_CHANNEL.GET_USERSCRIPTS]: () => this.getUserScripts(),
        [IPC_INVOKE_CHANNEL.SAVE_USERSCRIPT]: (data) => this.saveUserScript(data),
        [IPC_INVOKE_CHANNEL.IMPORT_USERSCRIPT]: () => this.importUserScript(),
        [IPC_INVOKE_CHANNEL.DELETE_USERSCRIPT]: (data) => this.deleteUserScript(data),
        [IPC_INVOKE_CHANNEL.TOGGLE_USERSCRIPT]: (data) => this.toggleUserScript(data),
        [IPC_INVOKE_CHANNEL.VAULT_LIST]: () => this.vaultList(),
        [IPC_INVOKE_CHANNEL.VAULT_ADD]: (data) => this.vaultAdd(data),
        [IPC_INVOKE_CHANNEL.VAULT_UPDATE]: (data) => this.vaultUpdate(data),
        [IPC_INVOKE_CHANNEL.VAULT_DELETE]: (data) => this.vaultDelete(data),
        [IPC_INVOKE_CHANNEL.VAULT_FILL]: (data) => this.vaultFill(data),
        [IPC_INVOKE_CHANNEL.VAULT_SELECT_CREDENTIAL]: (data) => this.vaultSelectCredential(data),
        [IPC_INVOKE_CHANNEL.VAULT_CONFIRM_SAVE]: (data) => this.vaultConfirmSave(data),
        [IPC_INVOKE_CHANNEL.VAULT_OPEN_MANAGER]: (data) => this.vaultOpenManager(data),
        [IPC_INVOKE_CHANNEL.USERSCRIPT_OPEN_MANAGER]: (data) => this.userscriptOpenManager(data),
        [IPC_INVOKE_CHANNEL.TRANSLATE_GET_PREFERENCE]: () => this.translateGetPreference(),
        [IPC_INVOKE_CHANNEL.TRANSLATE_SAVE_PREFERENCE]: (data) => this.translateSavePreference(data),
        [IPC_INVOKE_CHANNEL.TRANSLATE_DETECT_LANGUAGE]: (data) => this.translateDetectLanguage(data),
        [IPC_INVOKE_CHANNEL.TRANSLATE_PAGE]: (data) => this.translatePage(data),
        [IPC_INVOKE_CHANNEL.TRANSLATE_SELECTION]: (data) => this.translateSelection(data),
        [IPC_INVOKE_CHANNEL.TRANSLATE_OPEN_MANAGER]: (data) => this.translateOpenManager(data),
        [IPC_INVOKE_CHANNEL.TRANSLATE_GET_SELECTION_HISTORY]: () => this.translateGetSelectionHistory(),
      };

      this.listenerHandlers = {
        [IPC_EMIT_CHANNEL.SHOW_VIEW_BY_ID]: (data) => this.handleShowViewById(data),
        [IPC_EMIT_CHANNEL.VIEW_CHANGE_URL]: (data) => this.handleURLChange(data),
        [IPC_EMIT_CHANNEL.VIEW_RESPONSIVE]: (data) => this.handleResizeView(data),
        [IPC_EMIT_CHANNEL.HIDE_VIEW]: (data) => this.handleHideView(data),
        [IPC_EMIT_CHANNEL.ON_BACKWARD]: (data) => this.onGoBack(data),
        [IPC_EMIT_CHANNEL.ON_CLOSE_TAB]: (data) => this.onCloseTab(data),
        [IPC_EMIT_CHANNEL.TOGGLE_DEV_TOOLS]: (data) => this.handleToggleDevTools(data),
        [IPC_EMIT_CHANNEL.ON_RELOAD]: (data) => this.handleReloadTab(data),
        [IPC_EMIT_CHANNEL.CLOSE_APP]: () => this.onCloseApp(),
        [IPC_EMIT_CHANNEL.REQUEST_PIP]: (data) => this.requestPIP(data),
        [IPC_EMIT_CHANNEL.TOGGLE_BOOKMARK]: (data) => this.handleToggleBookmark(data),
      };
      console.log("initializeHandlers Completed");
    } catch (err) {
      console.log("initializeHandlers Error");
    }
  }

  async init() {
    try {
      await Promise.all([
        this.tabController.initialize(),
        this.vaultController.initialize(),
        this.translateController.initialize(),
      ]);
      await this.initializeHandlers();
      ipcMain.handle("invoke", (event, args: IPC) => this.onInvoke(args));
      ipcMain.on("send", (event, args: IPC) => this.onListener(args));
    } catch (error) {
      console.log("[ERROR] View Controller -", error);
    } finally {
      this.window.webContents.send("GET_TABS", this.getTabs());
    }
  }
  getTabs() {
    const response = this.tabController.getTabs();
    return response;
  }
  async getTab({ id }: { id: string }) {
    const tab = this.tabController.getTabById(id);
    return tab?.toJSON();
  }

  private onInvoke(args: IPC) {
    try {
      const { channel, data } = args;
      log.info(`[IPC Invoke] channel: ${channel}`);
      const handler = this.invokeHandlers?.[channel];
      if (handler) {
        return handler(data);
      }
      log.warn(`No invoke handler for channel: ${channel}`);
    } catch (error) {
      console.log("[ERRROR] INVOKE :", error);
    }
  }

  private onListener(args: IPC) {
    const { channel, data } = args;
    // log.info(`[IPC Listen] channel: ${channel}`);
    const handler = this.listenerHandlers?.[channel];
    if (handler) {
      handler(data);
    } else {
      log.warn(`No listener handler for channel: ${channel}`);
    }
  }

  createTab(tab?: Partial<ITab>) {
    const newTab = this.tabController.addNewTab(tab);
    this.window.webContents.send("GET_TABS", this.getTabs());
    return newTab;
  }

  async handleShowViewById(props: IHandleResizeView) {
    try {
      if (!props?.tab.id) throw new Error("Tab id not found");
      const currentTab = this.tabController.getTabById(props.tab?.id) as Tab;
      this.attachChildView(currentTab.view);
      const url1 = currentTab.url;
      const url2 = currentTab.webContents.getURL();
      if (!isSameURl(url1, url2)) {
        currentTab.webContents.loadURL(currentTab.url);
      }
      currentTab.show();
      currentTab.view.setBounds(props.screen);
      this.tabController.setActiveTab(currentTab.id);
    } catch (error) {
      return new ErrorServices(error);
    }
  }

  async handleURLChange(tab: ITab) {
    try {
      const { id, url } = tab;
      if (!id || !url) throw new Error("Tab id or url not found");
      const currentTab = this.tabController.getTabById(id);
      if (!currentTab) throw new Error("Tab not found");
      // await this.loadSessionByURL({
      //   url,
      //   view: currentTab.view,
      // });
      currentTab.webContents.loadURL(url);
      currentTab.updateUrl(url);
      this.window.webContents.send("GET_TABS", this.getTabs());
    } catch (error) {
      console.error("❌ Error loading URL:", error);
    }
  }

  handleResizeView(props: IHandleResizeView) {
    const { tab, screen } = props;
    const currentTab = this.tabController.getTabById(tab?.id as string);
    if (!currentTab) return;
    currentTab.view.setBounds(screen);
  }

  handleHideView(props: { id: string }) {
    try {
      if (!props || !props.id) return;
      const currentTab = this.tabController.getTabById(props.id);
      if (!currentTab) return;
      currentTab.hide();
      this.detachChildView(currentTab.view);
    } catch (error) {
      return new ErrorServices(error);
    }
  }

  onGoBack(props: { data: ITab }) {
    try {
      if (!props?.data?.id) throw new Error("Tab not found");
      const currentTab = this.tabController.getTabById(props?.data?.id);
      if (!currentTab) throw new Error("Tab not found");
      if (currentTab.webContents?.navigationHistory.canGoBack()) {
        currentTab.webContents?.navigationHistory.goBack();
      }
    } catch (error) {
      return new ErrorServices(error);
    }
  }

  async onCloseTab(props: { id: string }) {
    try {
      if (!props || !props.id) throw new Error("Tab not found");
      const currentTab = this.tabController.getTabById(props.id) as Tab;
      currentTab.hide();
      this.detachChildView(currentTab.view);
      const { nextTab } = this.tabController.closeTab(props.id);
      if (nextTab?.view) this.attachChildView(nextTab?.view);
      this.window.webContents.send("GET_TABS", this.getTabs());
    } catch (error) {
      return new ErrorServices(error);
    }
  }

  handleToggleDevTools(props: { id: string }) {
    if (!props || !props.id) return;
    const currentTab = this.tabController.getTabById(props?.id);
    if (!currentTab) return;
    const view = currentTab.view;
    if (!view) return;
    let isOpenedDevTools = view.webContents?.isDevToolsOpened();
    view.webContents?.toggleDevTools();
    if (isOpenedDevTools) {
      view.webContents?.closeDevTools();
    } else {
      view.webContents?.openDevTools();
    }
  }

  async handleReloadTab(tab: ITab) {
    try {
      let id = tab?.id || this.tabController.activeTab?.id;
      if (!id) throw new Error("Tab not found");
      const currentTab = this.tabController.getTabById(id);
      return currentTab?.onReload();
    } catch (error) {
      return new ErrorServices(error);
    }
  }

  async requestPIP({ tab }: { tab: ITab }) {
    try {
      if (!tab?.id) throw new Error(`Tab id not found`);
      const currentTab = this.tabController.getTabById(tab.id);
      return currentTab?.onRequestPIP();
    } catch (error) {
      return new ErrorServices(error);
    }
  }

  handleSearchPage(v: any) {
    // const view = this.viewManager[this.viewActive];
    // log.info("handleSearchPage", view);
    // if (!view) return;
    // log.info("handleSearchPage clearSelection");
    // view.webContents?.on("found-in-page", (event, result) => {
    //   console.log("found-in-page");
    //   if (result.finalUpdate) view.webContents?.stopFindInPage("clearSelection");
    // });
    // view.webContents?.findInPage(v.data, {
    //   forward: false,
    //   findNext: true,
    //   matchCase: true,
    // });
  }
  handleToggleBookmark({ url, id }: { url: string; id: string }) {
    this.tabController.addNewBookmark({ url, id });
  }

  async loadUserInterface() {
    const defaultData: IUserInterface = {
      layout: "default",
      mode: "default",
      dataSync: {
        intervalTime: "15",
        hardwareAcceleration: "1",
      },
    };
    try {
      const userInterface = await this.interfaceStore.readFiles();
      Object.assign(defaultData, userInterface);
      return userInterface;
    } catch (error) {
      return defaultData;
    }
  }

  async getCookieFromURL(url: string) {
    const { origin } = new URL(url);
    if (!origin) return;
    const viewCookie = await session.defaultSession.cookies.get({
      url: origin,
    });
    return viewCookie;
  }
  async persist() {
    try {
      const tabs = this.getTabs();
      // const cookies = session.defaultSession.cookies;
      // for (let i = 0; i < tabs.length; i++) {
      //   tabs[i].cookies = await this.getCookieFromURL(tabs[i].url);
      // }
      await Promise.all([
        this.minusSession?.cookies.flushStore(),
        this.minusSession?.flushStorageData(),
        this.userStore.saveFiles({ tabs: tabs || [], index: 0 }),
      ]);
      return this.window.webContents?.send("SYNC");
    } catch (error) {
      return new ErrorServices(error);
    }
  }

  attachChildView(view: WebContentsView) {
    this.window.contentView.addChildView(view);
  }
  detachChildView(view: WebContentsView) {
    this.window.contentView.removeChildView(view);
  }

  async onCloseApp() {
    try {
      await this.persist();
    } catch (error) {
      log.error("Failed to persist before quit", error);
    } finally {
      app.quit();
    }
  }

  interfaceSave(data: IUserInterface) {
    this.interfaceStore.saveFiles(data);
    if (data.dataSync.hardwareAcceleration === "0") {
      dialog
        .showMessageBox({
          title: "Warning",
          message: "Hardware acceleration is disabled. This may cause some issues. Do you want to continue? ",
          buttons: ["Yes", "No"],
        })
        .then((res) => {
          if (res.response === 0) {
            process.env.ELECTRON_DISABLE_GPU = "true";
            app.relaunch({
              args: process.argv.slice(1).concat(["--relaunch --disable-gpu"]),
            });
            app.exit(0);
          } else {
            process.env.ELECTRON_DISABLE_GPU = "";
          }
        });
    }
  }

  clearCache({ tab }: { tab: ITab }) {
    return this.tabController.getTabById(tab?.id as string)?.clearCache();
  }
  clearAllCache() {
    const tabs = this.getTabs();
    tabs.forEach((tab) => this.tabController.getTabById(tab.id)?.clearCache());
  }

  showNotification({ title, description }: { title: string; description: string }) {
    return new Notification({
      title: title,
      body: description,
    }).show();
  }

  async getUserScripts() {
    return this.userScriptManagerController.getUserScripts();
  }

  async saveUserScript(data: IUserScript) {
    console.log("save user Script");
    if (!data?.source?.trim()) {
      throw new Error("Script source is required");
    }
    return this.userScriptManagerController.saveUserScript(data);
  }

  async importUserScript() {
    const result = await dialog.showOpenDialog(this.window, {
      properties: ["openFile"],
      filters: [
        { name: "UserScript", extensions: ["user.js", "js"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
    if (result.canceled || !result.filePaths?.length) return null;
    const imported = await this.userScriptManagerController.importUserScript(result.filePaths[0]);
    return imported;
  }

  async deleteUserScript({ id }: { id: string }) {
    if (!id) {
      throw new Error("Script id is required");
    }
    return this.userScriptManagerController.deleteUserScript(id);
  }

  async toggleUserScript({ id, enabled }: { id: string; enabled?: boolean }) {
    if (!id) {
      throw new Error("Script id is required");
    }
    return this.userScriptManagerController.toggleUserScript(id, enabled);
  }

  async vaultList() {
    return this.vaultController.getVaults();
  }

  async vaultAdd(data: { site: string; username: string; password: string; notes?: string }) {
    if (!data?.site?.trim()) {
      throw new Error("Site is required");
    }
    if (!data?.username?.trim()) {
      throw new Error("Username is required");
    }
    if (!data?.password?.trim()) {
      throw new Error("Password is required");
    }
    return this.vaultController.addVault({
      site: data.site.trim(),
      username: data.username.trim(),
      password: data.password,
      notes: data.notes || "",
    });
  }

  async vaultUpdate(data: {
    id: string;
    patch: Partial<Pick<IPasswordItem, "site" | "username" | "password" | "notes">>;
  }) {
    if (!data?.id) {
      throw new Error("Vault item id is required");
    }
    return this.vaultController.updateVault(data.id, data.patch || {});
  }

  async vaultDelete(data: { id: string }) {
    if (!data?.id) {
      throw new Error("Vault item id is required");
    }
    return this.vaultController.removeVault(data.id);
  }

  async vaultFill(data: { tabId: string; credentialId: string }) {
    if (!data?.tabId) {
      throw new Error("Tab id is required");
    }
    if (!data?.credentialId) {
      throw new Error("Credential id is required");
    }
    const tab = this.tabController.getTabById(data.tabId);
    if (!tab) {
      throw new Error("Tab not found");
    }
    const credential = this.vaultController.getVaultById(data.credentialId);
    if (!credential) {
      throw new Error("Credential not found");
    }

    const script = this.vaultController.getDialogScriptInjection(credential);
    const result = await tab.webContents.executeJavaScript(script, true);
    return result;
  }

  async vaultSelectCredential(data: { tabId: string; candidates: { id: string; username: string; site: string }[] }) {
    if (!data?.tabId) throw new Error("Tab id is required");
    if (!Array.isArray(data?.candidates) || data.candidates.length === 0) {
      return null;
    }
    const tab = this.tabController.getTabById(data.tabId);
    if (!tab) throw new Error("Tab not found");
    return this.vaultServices.selectCredential(tab.webContents, data.candidates);
  }

  async vaultConfirmSave(data: { tabId: string; username: string; site: string }) {
    if (!data?.tabId) throw new Error("Tab id is required");
    const tab = this.tabController.getTabById(data.tabId);
    if (!tab) throw new Error("Tab not found");
    return this.vaultServices.confirmSave(tab.webContents, {
      username: data.username,
      site: data.site,
    });
  }

  async vaultOpenManager(data: { tabId: string }) {
    if (!data?.tabId) throw new Error("Tab id is required");
    const tab = this.tabController.getTabById(data.tabId);
    if (!tab) throw new Error("Tab not found");
    const vaultItems = this.vaultController.getVaults();
    const result = await this.vaultServices.openManager(
      this.window, // BrowserWindow — needed to addChildView the vault overlay
      tab, // full Tab — needed for tab.view.getBounds() and fallback webContents
      vaultItems,
    );
    if (!Array.isArray(result)) return false;
    const existing = this.vaultController.getVaults();
    const existingIds = new Set(existing.map((item) => item.id));
    const nextIds = new Set(result.filter((item) => item.id && existingIds.has(item.id)).map((item) => item.id));
    for (const current of existing) {
      if (!nextIds.has(current.id)) {
        await this.vaultController.removeVault(current.id);
      }
    }
    for (const item of result) {
      if (!item?.site?.trim() || !item?.username?.trim() || !item?.password?.trim()) {
        continue;
      }
      if (existingIds.has(item.id)) {
        await this.vaultController.updateVault(item.id, {
          site: item.site.trim(),
          username: item.username.trim(),
          password: item.password,
          notes: item.notes || "",
        });
      } else {
        await this.vaultController.addVault({
          site: item.site.trim(),
          username: item.username.trim(),
          password: item.password,
          notes: item.notes || "",
        });
      }
    }
    return true;
  }

  async userscriptOpenManager(data: { tabId: string }) {
    try {
      if (!data?.tabId) throw new Error("Tab id is required");
      const tab = this.tabController.getTabById(data.tabId);
      if (!tab) throw new Error("Tab not found");
      const scripts = this.userScriptManagerController.getUserScripts();
      const result = await this.userScriptDialogController.openManager(this.window, tab, scripts);
      if (!Array.isArray(result)) return false;
      const existing = this.userScriptManagerController.getUserScripts();
      const existingIds = new Set(existing.map((item) => item.id));
      const nextIds = new Set(result.filter((item) => item.id && existingIds.has(item.id)).map((item) => item.id));
      for (const current of existing) {
        if (!nextIds.has(current.id)) {
          await this.userScriptManagerController.deleteUserScript(current.id);
        }
      }
      for (const item of result) {
        if (!item?.source?.trim()) continue;
        if (existingIds.has(item.id)) {
          await this.userScriptManagerController.saveUserScript(item);
        } else {
          await this.userScriptManagerController.saveUserScript(item);
        }
      }
      return true;
    } catch (error) {
      log.error("error", error);
    }
  }

  async translateGetPreference() {
    return this.translateController.getPreference();
  }

  async translateSavePreference(data: Record<string, any>) {
    return this.translateController.savePreference(data || {});
  }

  async translateDetectLanguage(data: { text: string }) {
    if (!data?.text?.trim()) return { language: "unknown", confidence: 0 };
    return this.translateController.detectLanguage(data.text);
  }

  async translatePage(data: { tabId: string; url?: string; targetLanguage?: string }) {
    if (!data?.tabId) throw new Error("Tab id is required");
    const tab = this.tabController.getTabById(data.tabId);
    if (!tab) throw new Error("Tab not found");
    const targetUrl = data.url || tab.webContents.getURL();
    if (!targetUrl) throw new Error("Target url is required");
    const translatedUrl = this.translateController.buildTranslatePageUrl({
      targetUrl,
      targetLanguage: data.targetLanguage,
    });
    await tab.webContents.loadURL(translatedUrl);
    return { url: translatedUrl };
  }

  async translateSelection(data: { tabId: string; text?: string; sourceLanguage?: string; targetLanguage?: string }) {
    if (!data?.tabId) throw new Error("Tab id is required");
    const tab = this.tabController.getTabById(data.tabId);
    if (!tab) throw new Error("Tab not found");

    let text = data?.text?.trim() || "";
    if (!text) {
      const selected = await tab.webContents.executeJavaScript(
        `(() => String(window.getSelection?.()?.toString?.() || "").trim())();`,
        true,
      );
      text = String(selected || "").trim();
    }
    if (!text) throw new Error("Selection text is required");

    const result = await this.translateController.translateSelection({
      ...data,
      text,
    });
    if (result?.translatedText) {
      await tab.webContents.executeJavaScript(
        `(() => {
          const old = document.getElementById("__minus_translate_selection_popup");
          if (old) old.remove();
          const selection = window.getSelection?.();
          const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
          const rect = range ? range.getBoundingClientRect() : null;
          const anchor = window.__minusSelectionAnchor || {};
          const x = Number(rect?.left || anchor?.x || window.innerWidth / 2);
          const y = Number(rect?.bottom || anchor?.y || window.innerHeight / 2);

          const root = document.createElement("div");
          root.id = "__minus_translate_selection_popup";
          root.style.position = "fixed";
          root.style.zIndex = "2147483647";
          root.style.maxWidth = "340px";
          root.style.minWidth = "200px";
          root.style.left = Math.max(8, Math.min(window.innerWidth - 360, x)) + "px";
          root.style.top = Math.max(8, Math.min(window.innerHeight - 180, y + 10)) + "px";
          root.style.background = "#0f172a";
          root.style.color = "#fff";
          root.style.padding = "10px";
          root.style.borderRadius = "10px";
          root.style.border = "1px solid rgba(255,255,255,.15)";
          root.style.boxShadow = "0 18px 40px rgba(0,0,0,.35)";
          root.style.fontFamily = "Inter, system-ui, -apple-system, sans-serif";
          root.style.fontSize = "12px";
          root.style.lineHeight = "1.4";

          const meta = document.createElement("div");
          meta.style.opacity = ".8";
          meta.style.fontSize = "11px";
          meta.style.marginBottom = "6px";
          meta.textContent = ${JSON.stringify(`${result.sourceLanguage} -> ${result.targetLanguage}`)};

          const text = document.createElement("div");
          text.textContent = ${JSON.stringify(result.translatedText)};
          text.style.whiteSpace = "pre-wrap";
          text.style.wordBreak = "break-word";

          const close = document.createElement("button");
          close.type = "button";
          close.textContent = "×";
          close.style.position = "absolute";
          close.style.top = "4px";
          close.style.right = "6px";
          close.style.border = "none";
          close.style.background = "transparent";
          close.style.color = "#fff";
          close.style.cursor = "pointer";
          close.style.fontSize = "14px";
          close.onclick = () => root.remove();

          root.appendChild(meta);
          root.appendChild(text);
          root.appendChild(close);
          document.documentElement.appendChild(root);
          // setTimeout(() => root.remove(), 9000);
          let intervalId = null;
          intervalId = setInterval(() => {
            const currentSelection = String(window.getSelection?.()?.toString?.() || "").trim();
            if (currentSelection !== ${JSON.stringify(text)}) {
              clearInterval(intervalId);
              root.remove();
            }
          },1000)
        })();`,
        true,
      );
    }
    return result;
  }

  async translateOpenManager(data: { tabId: string }) {
    if (!data?.tabId) throw new Error("Tab id is required");
    const tab = this.tabController.getTabById(data.tabId);
    if (!tab) throw new Error("Tab not found");
    const result = await this.translateController.openManager(this.window, tab);
    if (!result) return false;
    await this.translateController.applyManagerState(result);
    return true;
  }

  async translateGetSelectionHistory() {
    return this.translateController.getRecentSelections();
  }
}
