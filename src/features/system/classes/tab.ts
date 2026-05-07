import { WebContentsView, BrowserWindow, session } from "electron";
import { v7 as uuid_v7 } from "uuid";
import { AdBlocker } from "../controller/adsBlock";
import { ContextMenuController } from "../controller/context";
import { ITab } from "../interfaces";
import log from "electron-log";
import { IPC_RENDERER_EVENT } from "../constants/ipc";
import { VaultController } from "../controller/vault";
import { UserScriptController } from "../controller/userScript";
// import { VaultController } from "~/features/vault/controller/vaultController";
interface IDestroy {
  destroy?: () => void;
}

const preloadScript = () => {
  // @ts-ignore
  function enterPictureInPicture(videoElement) {
    if (document.pictureInPictureEnabled && !videoElement.disablePictureInPicture) {
      try {
        if (document.pictureInPictureElement) {
          document.exitPictureInPicture();
        }
        videoElement
          .requestPictureInPicture()
          .then(() => {
            console.log("Entered Picture-in-Picture mode.");
          })
          // @ts-ignore
          .catch((error) => {
            console.error("Failed to enter Picture-in-Picture mode:", error);
          });
      } catch (err) {
        console.error(err);
      }
    }
  }
  setTimeout(() => {
    enterPictureInPicture(document.querySelector("video"));
  }, 500);
};

export class Tab {
  id: string = uuid_v7();
  title: string = "New Tab";
  url: string = "https://google.com";
  isPinned: boolean = false;
  isFocused: boolean = false;
  index?: number;
  favicon: string = "";
  timestamp: number = Date.now();
  isBookmarked: boolean = false;
  cookies?: Electron.Cookie[];
  minusSession: Electron.Session = session.fromPartition("persist:minus-browser");
  view: WebContentsView = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // sandbox: true,
      session: this.minusSession,
    },
  });
  webContents: Electron.WebContents & IDestroy;
  userscriptController: UserScriptController;
  credentialDetectionRegistered = false;
  credentialAssistRegistered = false;
  credentialAssistActionRegistered = false;
  tabEventsRegistered = false;

  constructor({
    blocker,
    userscriptController,
    ...props
  }: Partial<ITab> & {
    blocker: AdBlocker;
    userscriptController: UserScriptController;
  }) {
    Object.assign(this, props);
    this.userscriptController = userscriptController;
    this.webContents = this.view.webContents;
    this.view.setMaxListeners(20);
    blocker.setupAdvancedRequestBlocking(this.view);
    this.createContextMenu();
    this.requestPermissions();
    this.applyStyles();
  }

  updateTitle(title: string) {
    this.title = title;
  }

  updateUrl(url: string) {
    this.url = url;
  }

  updateTab(tab: Partial<ITab>) {
    Object.assign(this, tab);
  }

  onFocus() {
    this.isFocused = true;
  }
  onBlur() {
    this.isFocused = false;
  }

  private applyStyles() {
    this.view.setBorderRadius(8);
  }

  createContextMenu() {
    this.webContents.on("context-menu", new ContextMenuController().initialize);
  }
  requestPermissions() {
    this.view.webContents.session.setDisplayMediaRequestHandler(
      (request, callback) => {
        callback({ video: request.frame || undefined });
      },
      { useSystemPicker: true },
    );
    this.view.webContents.session.setPermissionRequestHandler((webContents, permission, request) => {
      // 'clipboard-read' | 'clipboard-sanitized-write' | 'display-capture' | 'fullscreen' | 'geolocation' | 'idle-detection' | 'media' | 'mediaKeySystem' | 'midi' | 'midiSysex' | 'notifications' | 'pointerLock' | 'keyboardLock' | 'openExternal' | 'speaker-selection' | 'storage-access' | 'top-level-storage-access' | 'window-management' | 'unknown' | 'fileSystem',
      // console.log("view.webContents.session.setPermissionRequestHandler", permission, webContents, request);
      if (
        permission === "unknown" ||
        permission === "fileSystem" ||
        permission === "storage-access" ||
        permission === "top-level-storage-access" ||
        permission === "mediaKeySystem"
      ) {
        return request(false);
      }
      return request(true);
    });
    this.view.webContents.setWindowOpenHandler(({ url }) => {
      try {
        const browserView = BrowserWindow.getFocusedWindow();
        browserView?.webContents?.send("CREATE_TAB", { url: url });
        return { action: "deny" };
      } catch (error) {
        return { action: "deny" };
      }
    });
  }
  onRequestPIP() {
    if (!this.view.webContents.isFocused()) {
      this.view.webContents.focus();
    }
    this.view.webContents
      .executeJavaScript(`(${preloadScript.toString()})()`)
      .then(() => {
        console.info("requestPIP success");
      })
      .catch((error) => {
        console.info("requestPIP error", error);
      });
  }
  onReload() {
    return this.view.webContents.reload();
  }
  show() {
    if ("setVisible" in this.view && !this.view.getVisible()) {
      this.view.setVisible(true);
    }
    setTimeout(() => {
      this.registerTabEvents();
    }, 1000);
  }
  hide() {
    if ("setVisible" in this.view) this.view.setVisible(false);
  }

  clearCache() {
    this.view.webContents.session.clearCache();
  }

  registerTabEvents() {
    if (this.tabEventsRegistered) return;
    this.tabEventsRegistered = true;
    this.faviconChanged();
    this.urlChanged();
    this.didStartLoad();
    this.didStopLoad();
    this.pageTitleUpdated();
    this.registerCredentialDetection();
    this.registerCredentialAssistAction();
  }

  unregisterTabEvents() {
    this.view.webContents.off("did-navigate-in-page", this.urlChanged.bind(this));
    this.view.webContents.off("page-favicon-updated", this.updateFavicon.bind(this));
    // @ts-ignore
    this.view.webContents.off("did-start-loading", this.updateNavigate.bind(this));
    // @ts-ignore
    this.view.webContents.off("did-stop-loading", this.updateNavigate.bind(this));
    // @ts-ignore
    this.view.webContents.off("page-title-updated", this.updateTitle.bind(this));
  }

  private faviconChanged() {
    this.view.webContents.on("page-favicon-updated", this.updateFavicon.bind(this));
  }
  private urlChanged() {
    try {
      this.view.webContents.on("did-navigate-in-page", this.updateURL.bind(this));
      this.view.webContents.on("did-navigate", this.updateURL.bind(this));
      this.view.webContents.on("did-navigate", (_event, url, _isInPlace, isMainFrame) => {
        if (!isMainFrame || !url) return;
        // this.runMatchedUserScripts(url, "document-start");
      });
    } catch (error) {
      log.info("URL change error");
    }
  }

  private updateFavicon(event: any, favicons: string[]) {
    this.favicon = favicons[0];
    const metaData = {
      favicon: favicons[0],
      title: this.view.webContents.getTitle(),
      url: this.view.webContents.getURL(),
    };
    const browser = BrowserWindow.getFocusedWindow();
    browser?.webContents?.send(`FAVICON_UPDATED:${this.id}`, metaData);
  }

  private updateURL(event: any, url: string) {
    this.url = url;
    const browser = BrowserWindow.getFocusedWindow();
    browser?.webContents?.send(`URL_CHANGED:${this.id}`, url);
  }

  private updateNavigate(data: { isLoading: boolean }) {
    const browser = BrowserWindow.getFocusedWindow();
    browser?.webContents?.send(`LOADING:${this.id}`, data.isLoading);
  }

  private didStartLoad() {
    this.view.webContents.on("did-start-loading", this.updateNavigate.bind(this, { isLoading: true }));
  }
  private didStopLoad() {
    this.view.webContents.on("did-stop-loading", this.updateNavigate.bind(this, { isLoading: false }));
    this.view.webContents.on("did-stop-loading", () => {
      this.runMatchedUserScripts(this.view.webContents.getURL(), "document-start");
      this.installCredentialFocusAssist();
    });
  }

  private pageTitleUpdated() {
    this.view.webContents.on("page-title-updated", this.pageTitleUpdate.bind(this));
  }

  private pageTitleUpdate(event: any, data: string) {
    const browser = BrowserWindow.getFocusedWindow();
    this.updateTitle(data);
    browser?.webContents?.send?.(`TITLE_UPDATED:${this.id}`, data);
  }

  private registerCredentialDetection() {
    if (this.credentialDetectionRegistered) return;
    this.credentialDetectionRegistered = true;
    this.view.webContents.on("will-navigate", () => {
      this.captureCredentialBeforeNavigate();
    });
    this.view.webContents.on("will-redirect", () => {
      this.captureCredentialBeforeNavigate();
    });
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      url: this.url,
      isPinned: this.isPinned,
      isFocused: this.isFocused,
      index: this.index,
      favicon: this.favicon,
      timestamp: this.timestamp,
      isBookmarked: this.isBookmarked,
      cookies: this.cookies,
    };
  }

  private async runMatchedUserScripts(url: string, runAt: "document-start" | "document-end" | "document-idle") {
    try {
      if (!this.userscriptController || !url) return;
      const scripts = this.userscriptController.getScriptsForURL(url);
      for (const script of scripts) {
        try {
          const codeToInject = `
            (function() {
              const id = "__" + ${JSON.stringify(script.id)};
              if (typeof window !== 'undefined' && !window[id]) {
                window[id] = true;
                try {
                  ${script.source}
                } catch (e) {
                  console.error("Injected script error:", e);
                }
              }
            })();
          `;

          this.view.webContents
            .executeJavaScript(codeToInject, true)
            .catch((err) => console.error("Execution failed:", err));
          log.info(`[UserScript:${script.name}] executed (runAt=${runAt}) on ${url}`);
        } catch (error) {
          log.error(`[UserScript:${script.name}] execution failed`, error);
        }
      }
    } catch (error) {
      log.error("runMatchedUserScripts error", error);
    }
  }

  private async captureCredentialBeforeNavigate() {
    try {
      const payload = await this.view.webContents.executeJavaScript(
        `(() => {
          const passwordInput = Array.from(
            document.querySelectorAll('input[type="password"]')
          ).find((item) => item && item.value && item.value.trim().length > 0);
          if (!passwordInput) return null;
          const selectors = [
            'input[type="email"]',
            'input[name*="user" i]',
            'input[name*="email" i]',
            'input[id*="user" i]',
            'input[id*="email" i]',
            'input[type="text"]'
          ];
          let usernameInput = passwordInput.form
            ? selectors.map((selector) => passwordInput.form.querySelector(selector)).find(Boolean)
            : null;
          if (!usernameInput) {
            usernameInput = selectors.map((selector) => document.querySelector(selector)).find(Boolean);
          }
          const username = usernameInput && usernameInput.value ? String(usernameInput.value).trim() : "";
          const password = String(passwordInput.value || "");
          if (!password.trim()) return null;
          return {
            username,
            password,
            url: window.location.href
          };
        })();`,
        true,
      );
      if (!payload?.password) return;
      const browser = BrowserWindow.getFocusedWindow();
      browser?.webContents?.send(IPC_RENDERER_EVENT.VAULT_CREDENTIAL_DETECTED, {
        tabId: this.id,
        ...payload,
      });
    } catch (error) {
      // Ignore capture errors because this is a best-effort detection hook.
    }
  }

  private async installCredentialFocusAssist() {
    if (this.credentialAssistRegistered) return;
    this.credentialAssistRegistered = true;
    try {
      const credentials = new VaultController().getVaults();
      const matchedCredentials = credentials.length ? credentials.filter((item) => this.url.includes(item.site)) : [];
      if (!matchedCredentials?.length) return;
      await this.view.webContents.executeJavaScript(
        `(() => {
          if (window.__minusCredentialAssistMounted) return;
          window.__minusCredentialAssistMounted = true;
          window.__minusCredentialAssistFocused = false;
          const ICON_ID = "__minus_credential_assist_icon";

          const ensureIcon = () => {
            let icon = document.getElementById(ICON_ID);
            if (icon) return icon;
            icon = document.createElement("img");
            icon.id = ICON_ID;
            icon.type = "button";
            icon.setAttribute("aria-label", "Credential assist");
            icon.style.position = "fixed";
            icon.style.zIndex = "2147483646";
            icon.style.width = "24px";
            icon.style.height = "24px";
            icon.style.display = "none";
            icon.style.alignItems = "center";
            icon.style.justifyContent = "center";
            icon.style.border = "0";
            icon.style.borderRadius = "4px";
            icon.style.background = "#fff";
            icon.style.color = "#fff";
            icon.style.boxShadow = "0 6px 18px rgba(15, 23, 42, .26)";
            icon.style.cursor = "pointer";
            icon.style.padding = "0.125rem";
            icon.style.fontSize = "13px";
            icon.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJpY29uIGljb24tdGFibGVyIGljb25zLXRhYmxlci1vdXRsaW5lIGljb24tdGFibGVyLWtleSI+PHBhdGggc3Ryb2tlPSJub25lIiBkPSJNMCAwaDI0djI0SDB6IiBmaWxsPSJub25lIiAvPjxwYXRoIGQ9Ik0xNi41NTUgMy44NDNsMy42MDIgMy42MDJhMi44NzcgMi44NzcgMCAwIDEgMCA0LjA2OWwtMi42NDMgMi42NDNhMi44NzcgMi44NzcgMCAwIDEgLTQuMDY5IDBsLS4zMDEgLS4zMDFsLTYuNTU4IDYuNTU4YTIgMiAwIDAgMSAtMS4yMzkgLjU3OGwtLjE3NSAuMDA4aC0xLjE3MmExIDEgMCAwIDEgLS45OTMgLS44ODNsLS4wMDcgLS4xMTd2LTEuMTcyYTIgMiAwIDAgMSAuNDY3IC0xLjI4NGwuMTE5IC0uMTNsLjQxNCAtLjQxNGgydi0yaDJ2LTJsMi4xNDQgLTIuMTQ0bC0uMzAxIC0uMzAxYTIuODc3IDIuODc3IDAgMCAxIDAgLTQuMDY5bDIuNjQzIC0yLjY0M2EyLjg3NyAyLjg3NyAwIDAgMSA0LjA2OSAwIiAvPjxwYXRoIGQ9Ik0xNSA5aC4wMSIgLz48L3N2Zz4='
            icon.title = "Credential assist: use Vault button on browser header";
            icon.addEventListener("mouseenter", () => { icon.style.background = "#ccc"; });
            icon.addEventListener("mouseleave", () => { icon.style.background = "#fff"; });
            icon.addEventListener("mousedown", (event) => {
              // Keep current input focus so focusout handler does not hide icon.
              event.preventDefault();
              event.stopPropagation();
            });
            icon.addEventListener("click", () => {
              console.log("__MINUS_FILL_PASSWORD_REQUEST__");
            });
            document.documentElement.appendChild(icon);
            return icon;
          };

          const wrapper = document.createElement("div")
          wrapper.id = 'minusInlineSuggestion'
          const shadowRoot = wrapper.attachShadow({ mode: "open" });
          const icon = ensureIcon()
          shadowRoot.appendChild(icon);


          const isTargetInput = (el) => {
            if (!el || el.tagName !== "INPUT") return false;
            const type = String(el.getAttribute("type") || "text").toLowerCase();
            const name = String(el.getAttribute("name") || "").toLowerCase();
            const id = String(el.getAttribute("id") || "").toLowerCase();
            const placeholder = String(el.getAttribute("placeholder") || "").toLowerCase();
            const joined = [type, name, id, placeholder].join(" ");
            return (
              joined.includes("email") ||
              joined.includes("user") ||
              joined.includes("name") ||
              joined.includes("pass")
            );
          };



          const hideIcon = () => {
            // const icon = document.getElementById(ICON_ID);
            if (icon) icon.style.display = "none";
          };

          const moveIcon = (target) => {
            if (!target) {
              icon.style.display = "none";
              return;
            }
            const rect = target.getBoundingClientRect();
            const top = Math.max(8, rect.top + (rect.height - 24) / 2);
            const left = Math.min(window.innerWidth - 32, rect.right + 8);
            icon.style.top = top + "px";
            icon.style.left = left + "px";
            icon.style.display = "inline-flex";
          };

          document.addEventListener("focusin", (event) => {
            const target = event.target;
            if (!isTargetInput(target)) {
              hideIcon();
              window.__minusCredentialAssistTarget = null;
              return;
            }
            window.__minusCredentialAssistTarget = target;
            window.__minusCredentialAssistFocused = true;
            moveIcon(target);
          }, true);

          document.addEventListener("focusout", () => {
          window.__minusCredentialAssistFocused = false;
            setTimeout(() => {
              const active = document.activeElement;
              const isIconActive = window.__minusCredentialAssistFocused
              if (!isTargetInput(active)) {
                if (isIconActive) return;
                hideIcon();
                window.__minusCredentialAssistTarget = null;
                window.__minusCredentialAssistFocused = false;
              }
            }, 60);
          }, true);

          window.addEventListener("scroll", () => {
            const target = window.__minusCredentialAssistTarget;
            if (target && isTargetInput(target)) moveIcon(target);
          }, true);

          window.addEventListener("resize", () => {
            const target = window.__minusCredentialAssistTarget;
            if (target && isTargetInput(target)) moveIcon(target);
          });
          document.body.appendChild(wrapper)
        })();`,
        true,
      );
    } catch (error) {}
  }

  private registerCredentialAssistAction() {
    if (this.credentialAssistActionRegistered) return;
    this.credentialAssistActionRegistered = true;
    this.view.webContents.on("console-message", (_event, _level, message) => {
      if (message !== "__MINUS_FILL_PASSWORD_REQUEST__") return;
      const browser = BrowserWindow.getFocusedWindow();
      browser?.webContents?.send(IPC_RENDERER_EVENT.FILL_PASSWORD_REQUEST, {
        tabId: this.id,
      });
    });
  }
}
