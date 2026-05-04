import { WebContentsView, BrowserWindow } from "electron";
import { v7 as uuid_v7 } from "uuid";
import { AdBlocker } from "../controller/adsBlock";
import { ContextMenuController } from "../controller/context";
import { ITab } from "../interfaces";
import log from "electron-log";
import { UserScriptController } from "../../userscripts";
import { IPC_RENDERER_EVENT } from "../constants/ipc";
interface IDestroy {
  destroy?: () => void;
}

const preloadScript = () => {
  // @ts-ignore
  function enterPictureInPicture(videoElement) {
    if (
      document.pictureInPictureEnabled &&
      !videoElement.disablePictureInPicture
    ) {
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
  index: number;
  favicon: string = "";
  timestamp: number = Date.now();
  isBookmarked: boolean = false;
  cookies: Electron.Cookie[];
  view: WebContentsView = new WebContentsView();
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
    userscriptController?: UserScriptController;
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
        callback({ video: request.frame });
      },
      { useSystemPicker: true },
    );
    this.view.webContents.session.setPermissionRequestHandler(
      (webContents, permission, request) => {
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
      },
    );
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
    this.view.webContents.off(
      "did-navigate-in-page",
      this.urlChanged.bind(this),
    );
    this.view.webContents.off(
      "page-favicon-updated",
      this.updateFavicon.bind(this),
    );
    this.view.webContents.off(
      "did-start-loading",
      this.updateNavigate.bind(this),
    );
    this.view.webContents.off(
      "did-stop-loading",
      this.updateNavigate.bind(this),
    );
    this.view.webContents.off(
      "page-title-updated",
      this.updateTitle.bind(this),
    );
  }

  private faviconChanged() {
    this.view.webContents.on(
      "page-favicon-updated",
      this.updateFavicon.bind(this),
    );
  }
  private urlChanged() {
    try {
      this.view.webContents.on(
        "did-navigate-in-page",
        this.updateURL.bind(this),
      );
      this.view.webContents.on("did-navigate", this.updateURL.bind(this));
      this.view.webContents.on(
        "did-navigate",
        (_event, url, _isInPlace, isMainFrame) => {
          if (!isMainFrame || !url) return;
          this.runMatchedUserScripts(url, "document-start");
        },
      );
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
    // this.runMatchedUserScripts(this.url, "document-start");
  }

  private didStartLoad() {
    this.view.webContents.on(
      "did-start-loading",
      this.updateNavigate.bind(this, { isLoading: true }),
    );
  }
  private didStopLoad() {
    this.view.webContents.on(
      "did-stop-loading",
      this.updateNavigate.bind(this, { isLoading: false }),
    );
    this.view.webContents.on("did-stop-loading", () => {
      this.runMatchedUserScripts(
        this.view.webContents.getURL(),
        "document-start",
      );
      this.installCredentialFocusAssist();
    });
  }

  private pageTitleUpdated() {
    this.view.webContents.on(
      "page-title-updated",
      this.pageTitleUpdate.bind(this),
    );
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

  private async runMatchedUserScripts(
    url: string,
    runAt: "document-start" | "document-end" | "document-idle",
  ) {
    try {
      if (!this.userscriptController || !url) return;
      const scripts = this.userscriptController.getScriptsForURL(url);
      // .filter((script) => script.runAt === runAt);
      for (const script of scripts) {
        try {
          // this.view.webContents.executeJavaScript(
          //   `(${JSON.stringify(script.source)})();`,
          // );
          const wrapped = `
            (() => {
              const __scriptSource = ${JSON.stringify(script.source)};
              const __runAt = ${JSON.stringify(runAt)};
              const __executeNow = () => {
                const fn = new Function(
                  "window",
                  "document",
                  "unsafeWindow",
                  __scriptSource,
                );
                fn(window, document, window);
              };
              if (__runAt === "document-start") {
                __executeNow();
                return;
              }
              if (__runAt === "document-end") {
                if (document.readyState === "loading") {
                  document.addEventListener("DOMContentLoaded", __executeNow, {
                    once: true,
                  });
                } else {
                  __executeNow();
                }
                return;
              }
              if (document.readyState === "complete") {
                __executeNow();
              } else {
                window.addEventListener("load", __executeNow, { once: true });
              }
            })();
          `;
          await this.view.webContents.executeJavaScript(wrapped);
          log.info(
            `[UserScript:${script.name}] executed (runAt=${runAt}) on ${url}`,
          );
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
      await this.view.webContents.executeJavaScript(
        `(() => {
          if (window.__minusCredentialAssistMounted) return;
          window.__minusCredentialAssistMounted = true;
          const ICON_ID = "__minus_credential_assist_icon";

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

          const ensureIcon = () => {
            let icon = document.getElementById(ICON_ID);
            if (icon) return icon;
            icon = document.createElement("button");
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
            icon.style.borderRadius = "50%";
            icon.style.background = "#334155";
            icon.style.color = "#fff";
            icon.style.boxShadow = "0 6px 18px rgba(15, 23, 42, .26)";
            icon.style.cursor = "pointer";
            icon.style.padding = "0";
            icon.style.fontSize = "13px";
            icon.textContent = "🔑";
            icon.title = "Credential assist: use Vault button on browser header";
            icon.addEventListener("mouseenter", () => { icon.style.background = "#0f172a"; });
            icon.addEventListener("mouseleave", () => { icon.style.background = "#334155"; });
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

          const hideIcon = () => {
            const icon = document.getElementById(ICON_ID);
            if (icon) icon.style.display = "none";
          };

          const moveIcon = (target) => {
            const icon = ensureIcon();
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
            moveIcon(target);
          }, true);

          document.addEventListener("focusout", () => {
            setTimeout(() => {
              const active = document.activeElement;
              const icon = document.getElementById(ICON_ID);
              const isIconActive =
                active === icon || icon?.contains?.(active);
              if (!isTargetInput(active)) {
                if (isIconActive) return;
                hideIcon();
                window.__minusCredentialAssistTarget = null;
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
