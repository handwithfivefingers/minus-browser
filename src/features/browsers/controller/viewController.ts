import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Notification,
  session,
  WebContentsView,
} from "electron";
import log from "electron-log";
import { IHandleResizeView, IPC, ITab } from "../interfaces";
import { IPasswordItem, PasswordController } from "../../password";
import { ErrorServices } from "../services/error.services";
import { StoreManager } from "../stores";
import { isSameURl } from "../utils";
import { IPC_EMIT_CHANNEL, IPC_INVOKE_CHANNEL } from "../constants/ipc";
import { TabController } from "./tab";
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
  wc: Electron.WebContents;
  userStore: StoreManager = new StoreManager("userData");
  interfaceStore: StoreManager = new StoreManager("interface");
  sessionStore: StoreManager = new StoreManager("session");
  tabController = new TabController();
  passwordController = new PasswordController();

  private invokeHandlers: Record<string, (data?: any) => any>;
  private listenerHandlers: Record<string, (data?: any) => void>;

  constructor(window: BrowserWindow) {
    this.window = window;
    this.init();
    this.window.webContents?.on(
      "render-process-gone",
      function (event, detailed) {
        log.info(
          "!crashed, reason: " +
            detailed.reason +
            ", exitCode = " +
            detailed.exitCode,
        );
        if (detailed.reason == "crashed") {
          window.webContents?.reload();
        } else {
          app.relaunch({ args: process.argv.slice(1).concat(["--relaunch"]) });
          app.exit(0);
        }
      },
    );
  }

  private async initializeHandlers() {
    try {
      this.invokeHandlers = {
        [IPC_INVOKE_CHANNEL.GET_TABS]: () => this.getTabs(),
        [IPC_INVOKE_CHANNEL.CREATE_TAB]: (tab?: Partial<ITab>) =>
          this.createTab(tab),
        [IPC_INVOKE_CHANNEL.GET_TAB]: (tab?: Partial<ITab>) =>
          this.getTab({ id: tab.id }),
        [IPC_INVOKE_CHANNEL.GET_USER_INTERFACE]: () => this.loadUserInterface(),
        [IPC_INVOKE_CHANNEL.CLOUD_SAVE]: () => this.cloudSave(),
        [IPC_INVOKE_CHANNEL.SEARCH_PAGE]: (data) => this.handleSearchPage(data),
        [IPC_INVOKE_CHANNEL.INTERFACE_SAVE]: (data) => this.interfaceSave(data),
        [IPC_INVOKE_CHANNEL.GET_USERSCRIPTS]: () => this.getUserScripts(),
        [IPC_INVOKE_CHANNEL.SAVE_USERSCRIPT]: (data) =>
          this.saveUserScript(data),
        [IPC_INVOKE_CHANNEL.IMPORT_USERSCRIPT]: () => this.importUserScript(),
        [IPC_INVOKE_CHANNEL.DELETE_USERSCRIPT]: (data) =>
          this.deleteUserScript(data),
        [IPC_INVOKE_CHANNEL.TOGGLE_USERSCRIPT]: (data) =>
          this.toggleUserScript(data),
        [IPC_INVOKE_CHANNEL.VAULT_LIST]: () => this.vaultList(),
        [IPC_INVOKE_CHANNEL.VAULT_ADD]: (data) => this.vaultAdd(data),
        [IPC_INVOKE_CHANNEL.VAULT_UPDATE]: (data) => this.vaultUpdate(data),
        [IPC_INVOKE_CHANNEL.VAULT_DELETE]: (data) => this.vaultDelete(data),
        [IPC_INVOKE_CHANNEL.VAULT_FILL]: (data) => this.vaultFill(data),
        [IPC_INVOKE_CHANNEL.VAULT_SELECT_CREDENTIAL]: (data) =>
          this.vaultSelectCredential(data),
        [IPC_INVOKE_CHANNEL.VAULT_CONFIRM_SAVE]: (data) =>
          this.vaultConfirmSave(data),
        [IPC_INVOKE_CHANNEL.VAULT_OPEN_MANAGER]: (data) =>
          this.vaultOpenManager(data),
        [IPC_INVOKE_CHANNEL.USERSCRIPT_OPEN_MANAGER]: (data) =>
          this.userscriptOpenManager(data),
      };

      this.listenerHandlers = {
        [IPC_EMIT_CHANNEL.SHOW_VIEW_BY_ID]: (data) =>
          this.handleShowViewById(data),
        [IPC_EMIT_CHANNEL.VIEW_CHANGE_URL]: (data) =>
          this.handleURLChange(data),
        [IPC_EMIT_CHANNEL.VIEW_RESPONSIVE]: (data) =>
          this.handleResizeView(data),
        [IPC_EMIT_CHANNEL.HIDE_VIEW]: (data) => this.handleHideView(data),
        [IPC_EMIT_CHANNEL.ON_BACKWARD]: (data) => this.onGoBack(data),
        [IPC_EMIT_CHANNEL.ON_CLOSE_TAB]: (data) => this.onCloseTab(data),
        [IPC_EMIT_CHANNEL.TOGGLE_DEV_TOOLS]: (data) =>
          this.handleToggleDevTools(data),
        [IPC_EMIT_CHANNEL.ON_RELOAD]: (data) => this.handleReloadTab(data),
        [IPC_EMIT_CHANNEL.CLOSE_APP]: () => this.onCloseApp(),
        [IPC_EMIT_CHANNEL.REQUEST_PIP]: (data) => this.requestPIP(data),
        [IPC_EMIT_CHANNEL.TOGGLE_BOOKMARK]: (data) =>
          this.handleToggleBookmark(data),
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
        this.passwordController.initialize(),
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
    console.log("Response", response);
    return response;
  }
  async getTab({ id }: { id: string }) {
    const tab = this.tabController.getTabById(id);
    return tab.toJSON();
  }

  private onInvoke(args: IPC) {
    try {
      const { channel, data } = args;
      log.info(`[IPC Invoke] channel: ${channel}`);
      const handler = this.invokeHandlers[channel];
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
    const handler = this.listenerHandlers[channel];
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
      const currentTab = this.tabController.getTabById(props.tab?.id);
      this.attachChildView(currentTab.view);
      // currentTab.view.webContents.loadURL(currentTab.url);
      const url1 = currentTab.url;
      const url2 = currentTab.webContents.getURL();
      if (!isSameURl(url1, url2)) {
        currentTab.webContents.loadURL(currentTab.url);
      }
      currentTab.show();
      currentTab.view.setBounds(props.screen);
      this.tabController.setActiveTab(currentTab.id);
      // currentTab.registerTabEvents();
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
      await this.loadSessionByURL({
        url,
        view: currentTab.view,
      });
      currentTab.webContents.loadURL(url);
      currentTab.updateUrl(url);
      this.window.webContents.send("GET_TABS", this.getTabs());
    } catch (error) {
      console.error("❌ Error loading URL:", error);
    }
  }

  async loadSessionByURL({
    url,
    view,
  }: {
    url: string;
    view: WebContentsView;
  }) {
    const { origin } = new URL(url);
    if (!origin) return;
    const viewCookie = await session.defaultSession.cookies.get({
      url: origin,
    });
    if (viewCookie.length) {
      viewCookie?.forEach((item) => {
        view.webContents?.session.cookies.set({
          url: origin,
          name: item.name,
          domain: item.domain,
          value: item.value,
          path: item.path,
          httpOnly: item.httpOnly,
          secure: item.secure,
          expirationDate: item.expirationDate,
          sameSite: item.sameSite,
        });
      });
    }
  }

  handleResizeView(props: IHandleResizeView) {
    const { tab, screen } = props;
    const currentTab = this.tabController.getTabById(tab.id);
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
      const currentTab = this.tabController.getTabById(props.id);
      currentTab.hide();
      this.detachChildView(currentTab.view);
      const { nextTab } = this.tabController.closeTab(props.id);
      this.attachChildView(nextTab.view);
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
      return currentTab.onRequestPIP();
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
  async cloudSave() {
    try {
      const tabs = this.getTabs();
      const cookies = session.defaultSession.cookies;
      for (let i = 0; i < tabs.length; i++) {
        tabs[i].cookies = await this.getCookieFromURL(tabs[i].url);
      }
      await Promise.all([
        cookies.flushStore(),
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

  onCloseApp() {
    app.quit();
  }

  interfaceSave(data: IUserInterface) {
    this.interfaceStore.saveFiles(data);
    if (data.dataSync.hardwareAcceleration === "0") {
      dialog
        .showMessageBox({
          title: "Warning",
          message:
            "Hardware acceleration is disabled. This may cause some issues. Do you want to continue? ",
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
    return this.tabController.getTabById(tab.id)?.clearCache();
  }
  clearAllCache() {
    const tabs = this.getTabs();
    tabs.forEach((tab) => this.tabController.getTabById(tab.id)?.clearCache());
  }

  showNotification({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) {
    return new Notification({
      title: title,
      body: description,
    }).show();
  }

  async getUserScripts() {
    return this.tabController.userScripts.listScripts();
  }

  async saveUserScript({
    id,
    source,
    enabled,
  }: {
    id?: string;
    source: string;
    enabled?: boolean;
  }) {
    if (!source?.trim()) {
      throw new Error("Script source is required");
    }
    return this.tabController.userScripts.saveScript({ id, source, enabled });
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
    const imported = await this.tabController.userScripts.importScriptFromFile(
      result.filePaths[0],
    );
    return imported;
  }

  async deleteUserScript({ id }: { id: string }) {
    if (!id) {
      throw new Error("Script id is required");
    }
    return this.tabController.userScripts.deleteScript(id);
  }

  async toggleUserScript({ id, enabled }: { id: string; enabled?: boolean }) {
    if (!id) {
      throw new Error("Script id is required");
    }
    return this.tabController.userScripts.toggleScript(id, enabled);
  }

  async vaultList() {
    return this.passwordController.list();
  }

  async vaultAdd(data: {
    site: string;
    username: string;
    password: string;
    notes?: string;
  }) {
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

  async vaultUpdate(data: {
    id: string;
    patch: Partial<
      Pick<IPasswordItem, "site" | "username" | "password" | "notes">
    >;
  }) {
    if (!data?.id) {
      throw new Error("Vault item id is required");
    }
    return this.passwordController.update(data.id, data.patch || {});
  }

  async vaultDelete(data: { id: string }) {
    if (!data?.id) {
      throw new Error("Vault item id is required");
    }
    return this.passwordController.remove(data.id);
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
    const credential = this.passwordController.getById(data.credentialId);
    if (!credential) {
      throw new Error("Credential not found");
    }

    const script = `(() => {
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
        userInput.value = creds.username;
        emit(userInput);
      }
      if (passwordInputs.length > 0) {
        const target = passwordInputs[0];
        target.focus();
        target.value = creds.password;
        emit(target);
      }
      return {
        filledUsername: Boolean(userInput),
        filledPassword: passwordInputs.length > 0
      };
    })();`;

    const result = await tab.webContents.executeJavaScript(script, true);
    return result;
  }

  async vaultSelectCredential(data: {
    tabId: string;
    candidates: { id: string; username: string; site: string }[];
  }) {
    if (!data?.tabId) throw new Error("Tab id is required");
    if (!Array.isArray(data?.candidates) || data.candidates.length === 0) {
      return null;
    }
    const tab = this.tabController.getTabById(data.tabId);
    if (!tab) throw new Error("Tab not found");

    const script = `(() => {
      const payload = ${JSON.stringify(data.candidates)};
      return new Promise((resolve) => {
        const old = document.getElementById("__minus_vault_picker");
        if (old) old.remove();
        const root = document.createElement("div");
        root.id = "__minus_vault_picker";
        root.style.position = "fixed";
        root.style.inset = "0";
        root.style.zIndex = "2147483647";
        root.style.background = "rgba(0,0,0,0.45)";
        root.style.display = "flex";
        root.style.alignItems = "center";
        root.style.justifyContent = "center";

        const panel = document.createElement("div");
        panel.style.width = "420px";
        panel.style.maxWidth = "92vw";
        panel.style.maxHeight = "70vh";
        panel.style.overflow = "auto";
        panel.style.background = "#fff";
        panel.style.borderRadius = "10px";
        panel.style.padding = "12px";
        panel.style.position = "relative";
        panel.style.fontFamily = "sans-serif";
        panel.style.color = "#0f172a";
        panel.innerHTML = '<div style="font-weight:600;margin-bottom:8px;">Choose Credential</div>';
        const close = (value) => {
          root.remove();
          document.removeEventListener("keydown", onKeyDown);
          resolve(value);
        };
        const onKeyDown = (event) => {
          if (event.key === "Escape") close(null);
        };
        document.addEventListener("keydown", onKeyDown);
        root.addEventListener("click", () => close(null));
        panel.addEventListener("click", (event) => event.stopPropagation());
        const closeBtn = document.createElement("button");
        closeBtn.textContent = "×";
        closeBtn.style.position = "absolute";
        closeBtn.style.top = "8px";
        closeBtn.style.right = "8px";
        closeBtn.style.border = "0";
        closeBtn.style.background = "transparent";
        closeBtn.style.fontSize = "18px";
        closeBtn.style.cursor = "pointer";
        closeBtn.onclick = () => close(null);
        panel.appendChild(closeBtn);

        payload.forEach((item) => {
          const btn = document.createElement("button");
          btn.textContent = item.username + " @ " + item.site;
          btn.style.width = "100%";
          btn.style.textAlign = "left";
          btn.style.padding = "8px";
          btn.style.marginBottom = "6px";
          btn.style.border = "0";
          btn.style.borderRadius = "6px";
          btn.style.background = "#f1f5f9";
          btn.style.cursor = "pointer";
          btn.onclick = () => {
            close(item.id);
          };
          panel.appendChild(btn);
        });

        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.justifyContent = "flex-end";
        actions.style.marginTop = "8px";
        const cancel = document.createElement("button");
        cancel.textContent = "Cancel";
        cancel.style.padding = "6px 10px";
        cancel.style.border = "0";
        cancel.style.borderRadius = "6px";
        cancel.style.background = "#cbd5e1";
        cancel.style.cursor = "pointer";
        cancel.onclick = () => {
          close(null);
        };
        actions.appendChild(cancel);
        panel.appendChild(actions);

        root.appendChild(panel);
        document.documentElement.appendChild(root);
      });
    })();`;

    return tab.webContents.executeJavaScript(script, true);
  }

  async vaultConfirmSave(data: {
    tabId: string;
    username: string;
    site: string;
  }) {
    if (!data?.tabId) throw new Error("Tab id is required");
    const tab = this.tabController.getTabById(data.tabId);
    if (!tab) throw new Error("Tab not found");

    const script = `(() => {
      const username = ${JSON.stringify(data.username || "this account")};
      const site = ${JSON.stringify(data.site || "this site")};
      return new Promise((resolve) => {
        const old = document.getElementById("__minus_vault_save_confirm");
        if (old) old.remove();
        const root = document.createElement("div");
        root.id = "__minus_vault_save_confirm";
        root.style.position = "fixed";
        root.style.inset = "0";
        root.style.zIndex = "2147483647";
        root.style.background = "rgba(0,0,0,0.45)";
        root.style.display = "flex";
        root.style.alignItems = "center";
        root.style.justifyContent = "center";

        const panel = document.createElement("div");
        panel.style.width = "420px";
        panel.style.maxWidth = "92vw";
        panel.style.background = "#fff";
        panel.style.borderRadius = "10px";
        panel.style.padding = "12px";
        panel.style.position = "relative";
        panel.style.fontFamily = "sans-serif";
        panel.style.color = "#0f172a";
        const close = (value) => {
          root.remove();
          document.removeEventListener("keydown", onKeyDown);
          resolve(value);
        };
        const onKeyDown = (event) => {
          if (event.key === "Escape") close(false);
        };
        document.addEventListener("keydown", onKeyDown);
        root.addEventListener("click", () => close(false));
        panel.addEventListener("click", (event) => event.stopPropagation());
        const closeBtn = document.createElement("button");
        closeBtn.textContent = "×";
        closeBtn.style.position = "absolute";
        closeBtn.style.top = "8px";
        closeBtn.style.right = "8px";
        closeBtn.style.border = "0";
        closeBtn.style.background = "transparent";
        closeBtn.style.fontSize = "18px";
        closeBtn.style.cursor = "pointer";
        closeBtn.onclick = () => close(false);
        panel.innerHTML =
          '<div style="font-weight:600;margin-bottom:8px;">Save Credential?</div>' +
          '<div style="font-size:13px;margin-bottom:12px;">Save credential for <b>' +
          username +
          '</b> on <b>' +
          site +
          "</b>?</div>";
        panel.appendChild(closeBtn);

        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.justifyContent = "flex-end";
        actions.style.gap = "8px";

        const ignore = document.createElement("button");
        ignore.textContent = "Ignore";
        ignore.style.padding = "6px 10px";
        ignore.style.border = "0";
        ignore.style.borderRadius = "6px";
        ignore.style.background = "#cbd5e1";
        ignore.style.cursor = "pointer";
        ignore.onclick = () => {
          close(false);
        };

        const save = document.createElement("button");
        save.textContent = "Save";
        save.style.padding = "6px 10px";
        save.style.border = "0";
        save.style.borderRadius = "6px";
        save.style.background = "#4f46e5";
        save.style.color = "#fff";
        save.style.cursor = "pointer";
        save.onclick = () => {
          close(true);
        };

        actions.appendChild(ignore);
        actions.appendChild(save);
        panel.appendChild(actions);
        root.appendChild(panel);
        document.documentElement.appendChild(root);
      });
    })();`;

    return tab.webContents.executeJavaScript(script, true);
  }

  async vaultOpenManager(data: { tabId: string }) {
    if (!data?.tabId) throw new Error("Tab id is required");
    const tab = this.tabController.getTabById(data.tabId);
    if (!tab) throw new Error("Tab not found");
    const vaultItems = this.passwordController.list();
    const result = await tab.webContents.executeJavaScript(
      `(() => {
        const input = ${JSON.stringify(vaultItems)};
        return new Promise((resolve) => {
          const rootId = "__minus_vault_manager";
          const old = document.getElementById(rootId);
          if (old) old.remove();
          const root = document.createElement("div");
          root.id = rootId;
          root.style.position = "fixed";
          root.style.inset = "0";
          root.style.zIndex = "2147483647";
          root.style.background = "rgba(0,0,0,.45)";
          root.style.display = "flex";
          root.style.alignItems = "center";
          root.style.justifyContent = "center";
          root.style.fontFamily = "sans-serif";

          const panel = document.createElement("div");
          panel.style.width = "860px";
          panel.style.maxWidth = "94vw";
          panel.style.height = "70vh";
          panel.style.background = "#fff";
          panel.style.borderRadius = "12px";
          panel.style.display = "grid";
          panel.style.gridTemplateColumns = "300px 1fr";
          panel.style.overflow = "hidden";
          panel.style.position = "relative";
          const close = (value) => {
            root.remove();
            document.removeEventListener("keydown", onKeyDown);
            resolve(value);
          };
          const onKeyDown = (event) => {
            if (event.key === "Escape") close(null);
          };
          document.addEventListener("keydown", onKeyDown);
          root.addEventListener("click", () => close(null));
          panel.addEventListener("click", (event) => event.stopPropagation());
          const closeBtn = document.createElement("button");
          closeBtn.textContent = "×";
          closeBtn.style.position = "absolute";
          closeBtn.style.top = "8px";
          closeBtn.style.right = "8px";
          closeBtn.style.border = "0";
          closeBtn.style.background = "transparent";
          closeBtn.style.fontSize = "18px";
          closeBtn.style.cursor = "pointer";
          closeBtn.onclick = () => close(null);
          panel.appendChild(closeBtn);

          const left = document.createElement("div");
          left.style.borderRight = "1px solid #e2e8f0";
          left.style.padding = "10px";
          left.style.overflow = "auto";

          const right = document.createElement("div");
          right.style.padding = "10px";
          right.style.display = "flex";
          right.style.flexDirection = "column";
          right.style.gap = "8px";

          let items = (input || []).map((item) => ({ ...item }));
          let selectedId = items[0] ? items[0].id : null;

          const getSelected = () => items.find((item) => item.id === selectedId);
          const uid = () => "new-" + Math.random().toString(36).slice(2);

          const renderList = () => {
            left.innerHTML = "";
            const title = document.createElement("div");
            title.textContent = "Password Vault";
            title.style.fontWeight = "600";
            title.style.marginBottom = "8px";
            left.appendChild(title);
            const addBtn = document.createElement("button");
            addBtn.textContent = "New";
            addBtn.style.border = "0";
            addBtn.style.background = "#4f46e5";
            addBtn.style.color = "#fff";
            addBtn.style.padding = "6px 10px";
            addBtn.style.borderRadius = "6px";
            addBtn.style.cursor = "pointer";
            addBtn.style.marginBottom = "8px";
            addBtn.onclick = () => {
              const item = {
                id: uid(),
                site: "",
                username: "",
                password: "",
                notes: "",
              };
              items.unshift(item);
              selectedId = item.id;
              renderList();
              renderForm();
            };
            left.appendChild(addBtn);

            items.forEach((item) => {
              const btn = document.createElement("button");
              btn.textContent = (item.username || "unknown") + " @ " + (item.site || "new site");
              btn.style.display = "block";
              btn.style.width = "100%";
              btn.style.textAlign = "left";
              btn.style.marginBottom = "6px";
              btn.style.border = "0";
              btn.style.padding = "8px";
              btn.style.borderRadius = "6px";
              btn.style.cursor = "pointer";
              btn.style.background = selectedId === item.id ? "#e0e7ff" : "#f1f5f9";
              btn.onclick = () => {
                selectedId = item.id;
                renderList();
                renderForm();
              };
              left.appendChild(btn);
            });
          };

          const renderForm = () => {
            right.innerHTML = "";
            const selected = getSelected();
            const title = document.createElement("div");
            title.textContent = "Edit Credential";
            title.style.fontWeight = "600";
            right.appendChild(title);
            if (!selected) {
              const empty = document.createElement("div");
              empty.textContent = "No credential selected.";
              empty.style.color = "#64748b";
              right.appendChild(empty);
              return;
            }

            const mkInput = (labelText, value, type = "text") => {
              const wrap = document.createElement("label");
              wrap.style.display = "flex";
              wrap.style.flexDirection = "column";
              wrap.style.gap = "4px";
              wrap.style.fontSize = "12px";
              const label = document.createElement("span");
              label.textContent = labelText;
              const input = document.createElement("input");
              input.type = type;
              input.value = value || "";
              input.style.border = "1px solid #cbd5e1";
              input.style.padding = "7px";
              input.style.borderRadius = "6px";
              wrap.appendChild(label);
              wrap.appendChild(input);
              return { wrap, input };
            };

            const mkArea = (labelText, value) => {
              const wrap = document.createElement("label");
              wrap.style.display = "flex";
              wrap.style.flexDirection = "column";
              wrap.style.gap = "4px";
              wrap.style.fontSize = "12px";
              const label = document.createElement("span");
              label.textContent = labelText;
              const area = document.createElement("textarea");
              area.value = value || "";
              area.style.border = "1px solid #cbd5e1";
              area.style.padding = "7px";
              area.style.borderRadius = "6px";
              area.style.minHeight = "86px";
              wrap.appendChild(label);
              wrap.appendChild(area);
              return { wrap, area };
            };

            const site = mkInput("Site", selected.site);
            const username = mkInput("Username", selected.username);
            const password = mkInput("Password", selected.password, "password");
            const notes = mkArea("Notes", selected.notes || "");

            right.appendChild(site.wrap);
            right.appendChild(username.wrap);
            right.appendChild(password.wrap);
            right.appendChild(notes.wrap);

            const actions = document.createElement("div");
            actions.style.display = "flex";
            actions.style.justifyContent = "space-between";
            actions.style.marginTop = "auto";

            const leftAction = document.createElement("button");
            leftAction.textContent = "Delete";
            leftAction.style.border = "0";
            leftAction.style.background = "#fee2e2";
            leftAction.style.color = "#b91c1c";
            leftAction.style.padding = "6px 10px";
            leftAction.style.borderRadius = "6px";
            leftAction.style.cursor = "pointer";
            leftAction.onclick = () => {
              items = items.filter((item) => item.id !== selected.id);
              selectedId = items[0] ? items[0].id : null;
              renderList();
              renderForm();
            };

            const rightActions = document.createElement("div");
            rightActions.style.display = "flex";
            rightActions.style.gap = "8px";

            const apply = document.createElement("button");
            apply.textContent = "Apply";
            apply.style.border = "0";
            apply.style.background = "#4f46e5";
            apply.style.color = "#fff";
            apply.style.padding = "6px 10px";
            apply.style.borderRadius = "6px";
            apply.style.cursor = "pointer";
            apply.onclick = () => {
              selected.site = site.input.value.trim();
              selected.username = username.input.value.trim();
              selected.password = password.input.value;
              selected.notes = notes.area.value;
              renderList();
            };

            const done = document.createElement("button");
            done.textContent = "Done";
            done.style.border = "0";
            done.style.background = "#0f172a";
            done.style.color = "#fff";
            done.style.padding = "6px 10px";
            done.style.borderRadius = "6px";
            done.style.cursor = "pointer";
            done.onclick = () => {
              close(items);
            };

            const cancel = document.createElement("button");
            cancel.textContent = "Cancel";
            cancel.style.border = "0";
            cancel.style.background = "#cbd5e1";
            cancel.style.padding = "6px 10px";
            cancel.style.borderRadius = "6px";
            cancel.style.cursor = "pointer";
            cancel.onclick = () => {
              close(null);
            };

            rightActions.appendChild(cancel);
            rightActions.appendChild(apply);
            rightActions.appendChild(done);

            actions.appendChild(leftAction);
            actions.appendChild(rightActions);
            right.appendChild(actions);
          };

          panel.appendChild(left);
          panel.appendChild(right);
          root.appendChild(panel);
          document.documentElement.appendChild(root);
          renderList();
          renderForm();
        });
      })();`,
      true,
    );

    if (!Array.isArray(result)) return false;

    const existing = this.passwordController.list();
    const existingIds = new Set(existing.map((item) => item.id));
    const nextIds = new Set(
      result
        .filter((item) => item.id && existingIds.has(item.id))
        .map((item) => item.id),
    );
    for (const current of existing) {
      if (!nextIds.has(current.id)) {
        await this.passwordController.remove(current.id);
      }
    }
    for (const item of result) {
      if (
        !item?.site?.trim() ||
        !item?.username?.trim() ||
        !item?.password?.trim()
      ) {
        continue;
      }
      if (existingIds.has(item.id)) {
        await this.passwordController.update(item.id, {
          site: item.site.trim(),
          username: item.username.trim(),
          password: item.password,
          notes: item.notes || "",
        });
      } else {
        await this.passwordController.add({
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
    if (!data?.tabId) throw new Error("Tab id is required");
    const tab = this.tabController.getTabById(data.tabId);
    if (!tab) throw new Error("Tab not found");
    const scripts = this.tabController.userScripts.listScripts();

    const result = await tab.webContents.executeJavaScript(
      `(() => {
        const input = ${JSON.stringify(scripts)};
        return new Promise((resolve) => {
          const rootId = "__minus_script_manager";
          const old = document.getElementById(rootId);
          if (old) old.remove();
          const root = document.createElement("div");
          root.id = rootId;
          root.style.position = "fixed";
          root.style.inset = "0";
          root.style.zIndex = "2147483647";
          root.style.background = "rgba(0,0,0,.45)";
          root.style.display = "flex";
          root.style.alignItems = "center";
          root.style.justifyContent = "center";
          root.style.fontFamily = "sans-serif";

          const panel = document.createElement("div");
          panel.style.width = "900px";
          panel.style.maxWidth = "94vw";
          panel.style.height = "72vh";
          panel.style.background = "#fff";
          panel.style.borderRadius = "12px";
          panel.style.display = "grid";
          panel.style.gridTemplateColumns = "300px 1fr";
          panel.style.overflow = "hidden";
          panel.style.position = "relative";
          const close = (value) => {
            root.remove();
            document.removeEventListener("keydown", onKeyDown);
            resolve(value);
          };
          const onKeyDown = (event) => {
            if (event.key === "Escape") close(null);
          };
          document.addEventListener("keydown", onKeyDown);
          root.addEventListener("click", () => close(null));
          panel.addEventListener("click", (event) => event.stopPropagation());
          const closeBtn = document.createElement("button");
          closeBtn.textContent = "×";
          closeBtn.style.position = "absolute";
          closeBtn.style.top = "8px";
          closeBtn.style.right = "8px";
          closeBtn.style.border = "0";
          closeBtn.style.background = "transparent";
          closeBtn.style.fontSize = "18px";
          closeBtn.style.cursor = "pointer";
          closeBtn.onclick = () => close(null);
          panel.appendChild(closeBtn);

          const left = document.createElement("div");
          left.style.borderRight = "1px solid #e2e8f0";
          left.style.padding = "10px";
          left.style.overflow = "auto";
          const right = document.createElement("div");
          right.style.padding = "10px";
          right.style.display = "flex";
          right.style.flexDirection = "column";
          right.style.gap = "8px";

          let items = (input || []).map((item) => ({ ...item }));
          let selectedId = items[0] ? items[0].id : null;
          const uid = () => "new-" + Math.random().toString(36).slice(2);
          const getSelected = () => items.find((item) => item.id === selectedId);

          const renderList = () => {
            left.innerHTML = "";
            const title = document.createElement("div");
            title.textContent = "Tampermonkey Scripts";
            title.style.fontWeight = "600";
            title.style.marginBottom = "8px";
            left.appendChild(title);

            const addBtn = document.createElement("button");
            addBtn.textContent = "New Script";
            addBtn.style.border = "0";
            addBtn.style.background = "#4f46e5";
            addBtn.style.color = "#fff";
            addBtn.style.padding = "6px 10px";
            addBtn.style.borderRadius = "6px";
            addBtn.style.cursor = "pointer";
            addBtn.style.marginBottom = "8px";
            addBtn.onclick = () => {
              const item = {
                id: uid(),
                source:
                  "// ==UserScript==\\n// @name New Script\\n// @match *://*/*\\n// @run-at document-end\\n// ==/UserScript==\\n",
                enabled: false,
              };
              items.unshift(item);
              selectedId = item.id;
              renderList();
              renderForm();
            };
            left.appendChild(addBtn);

            items.forEach((item) => {
              const btn = document.createElement("button");
              btn.textContent =
                (item.name || "Unnamed Script") +
                (item.enabled ? " (ON)" : " (OFF)");
              btn.style.display = "block";
              btn.style.width = "100%";
              btn.style.textAlign = "left";
              btn.style.marginBottom = "6px";
              btn.style.border = "0";
              btn.style.padding = "8px";
              btn.style.borderRadius = "6px";
              btn.style.cursor = "pointer";
              btn.style.background = selectedId === item.id ? "#e0e7ff" : "#f1f5f9";
              btn.onclick = () => {
                selectedId = item.id;
                renderList();
                renderForm();
              };
              left.appendChild(btn);
            });
          };

          const renderForm = () => {
            right.innerHTML = "";
            const selected = getSelected();
            const title = document.createElement("div");
            title.textContent = "Edit Script";
            title.style.fontWeight = "600";
            right.appendChild(title);
            if (!selected) {
              const empty = document.createElement("div");
              empty.textContent = "No script selected.";
              empty.style.color = "#64748b";
              right.appendChild(empty);
              return;
            }
            const toggleWrap = document.createElement("label");
            toggleWrap.style.display = "flex";
            toggleWrap.style.gap = "8px";
            toggleWrap.style.alignItems = "center";
            toggleWrap.style.fontSize = "12px";
            const chk = document.createElement("input");
            chk.type = "checkbox";
            chk.checked = Boolean(selected.enabled);
            const txt = document.createElement("span");
            txt.textContent = "Enabled";
            toggleWrap.appendChild(chk);
            toggleWrap.appendChild(txt);
            right.appendChild(toggleWrap);

            const area = document.createElement("textarea");
            area.value = selected.source || "";
            area.style.flex = "1";
            area.style.minHeight = "360px";
            area.style.border = "1px solid #cbd5e1";
            area.style.borderRadius = "6px";
            area.style.padding = "8px";
            area.style.fontSize = "12px";
            right.appendChild(area);

            const actions = document.createElement("div");
            actions.style.display = "flex";
            actions.style.justifyContent = "space-between";

            const del = document.createElement("button");
            del.textContent = "Delete";
            del.style.border = "0";
            del.style.background = "#fee2e2";
            del.style.color = "#b91c1c";
            del.style.padding = "6px 10px";
            del.style.borderRadius = "6px";
            del.style.cursor = "pointer";
            del.onclick = () => {
              items = items.filter((item) => item.id !== selected.id);
              selectedId = items[0] ? items[0].id : null;
              renderList();
              renderForm();
            };

            const rightActions = document.createElement("div");
            rightActions.style.display = "flex";
            rightActions.style.gap = "8px";

            const cancel = document.createElement("button");
            cancel.textContent = "Cancel";
            cancel.style.border = "0";
            cancel.style.background = "#cbd5e1";
            cancel.style.padding = "6px 10px";
            cancel.style.borderRadius = "6px";
            cancel.style.cursor = "pointer";
            cancel.onclick = () => {
              close(null);
            };

            const apply = document.createElement("button");
            apply.textContent = "Apply";
            apply.style.border = "0";
            apply.style.background = "#4f46e5";
            apply.style.color = "#fff";
            apply.style.padding = "6px 10px";
            apply.style.borderRadius = "6px";
            apply.style.cursor = "pointer";
            apply.onclick = () => {
              selected.source = area.value;
              selected.enabled = chk.checked;
              renderList();
            };

            const done = document.createElement("button");
            done.textContent = "Done";
            done.style.border = "0";
            done.style.background = "#0f172a";
            done.style.color = "#fff";
            done.style.padding = "6px 10px";
            done.style.borderRadius = "6px";
            done.style.cursor = "pointer";
            done.onclick = () => {
              close(items);
            };

            rightActions.appendChild(cancel);
            rightActions.appendChild(apply);
            rightActions.appendChild(done);
            actions.appendChild(del);
            actions.appendChild(rightActions);
            right.appendChild(actions);
          };

          panel.appendChild(left);
          panel.appendChild(right);
          root.appendChild(panel);
          document.documentElement.appendChild(root);
          renderList();
          renderForm();
        });
      })();`,
      true,
    );

    if (!Array.isArray(result)) return false;
    const existing = this.tabController.userScripts.listScripts();
    const existingIds = new Set(existing.map((item) => item.id));
    const nextIds = new Set(
      result
        .filter((item) => item.id && existingIds.has(item.id))
        .map((item) => item.id),
    );
    for (const current of existing) {
      if (!nextIds.has(current.id)) {
        await this.tabController.userScripts.deleteScript(current.id);
      }
    }
    for (const item of result) {
      if (!item?.source?.trim()) continue;
      if (existingIds.has(item.id)) {
        await this.tabController.userScripts.saveScript({
          id: item.id,
          source: item.source,
          enabled: Boolean(item.enabled),
        });
      } else {
        await this.tabController.userScripts.saveScript({
          source: item.source,
          enabled: Boolean(item.enabled),
        });
      }
    }
    return true;
  }
}
