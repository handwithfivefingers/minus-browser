import path from "node:path";
import { pathToFileURL } from "node:url";
// import { openUserScriptManagerDialog } from "../../injection/ui/userscriptManagerDialog";
import { BrowserWindow, WebContentsView } from "electron";
import { Tab } from "~/features/system/classes/tab";
export const openUserScriptManagerDialog = (input: any[]) => {
  const trustPolicy = (window as any)?.trustedTypes?.createPolicy("forceInner", {
    createHTML: (to_escape: string) => to_escape,
  });
  return new Promise((resolve) => {
    const rootId = "__minus_script_manager";
    const old = document.getElementById(rootId);
    if (old) old.remove();

    const root = document.createElement("div");
    root.id = rootId;
    root.style.position = "fixed";
    root.style.inset = "0";
    root.style.zIndex = "2147483647";
    root.style.background = "rgba(15,23,42,.55)";
    root.style.display = "flex";
    root.style.alignItems = "center";
    root.style.justifyContent = "center";
    root.style.fontFamily = "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    root.style.fontSize = "12px";

    const panel = document.createElement("div");
    panel.style.width = "980px";
    panel.style.maxWidth = "96vw";
    panel.style.height = "80vh";
    panel.style.background = "#fff";
    panel.style.borderRadius = "14px";
    panel.style.display = "grid";
    panel.style.gridTemplateColumns = "320px 1fr";
    panel.style.overflow = "hidden";
    panel.style.position = "relative";
    panel.style.border = "1px solid #e2e8f0";
    panel.style.boxShadow = "0 30px 80px rgba(2,6,23,.30)";

    let items = (input || []).map((item) => ({ ...item }));
    let selectedId = items[0] ? items[0].id : null;

    const icon = {
      plus: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
      trash:
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></svg>',
      check:
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 5 5L20 7"/></svg>',
      x: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
      disk: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>',
    };

    const applyButtonBase = (btn: HTMLButtonElement) => {
      btn.style.display = "inline-flex";
      btn.style.alignItems = "center";
      btn.style.gap = "6px";
      btn.style.fontSize = "12px";
      btn.style.lineHeight = "1";
      btn.style.height = "30px";
      btn.style.padding = "0 10px";
      btn.style.borderRadius = "8px";
      btn.style.cursor = "pointer";
      btn.style.border = "1px solid transparent";
    };

    const styleButton = (
      btn: HTMLButtonElement,
      normalBg: string,
      hoverBg: string,
      normalColor: string,
      border = "transparent",
    ) => {
      btn.style.background = normalBg;
      btn.style.color = normalColor;
      btn.style.borderColor = border;
      btn.addEventListener("mouseenter", () => {
        btn.style.background = hoverBg;
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.background = normalBg;
      });
    };

    const getSelected = () => items.find((item) => item.id === selectedId);
    const uid = () => "new-" + Math.random().toString(36).slice(2);

    const parseMeta = (source: string) => {
      const lines = String(source || "").split("\n");
      let name = "Unnamed Script";
      let runAt = "document-end";
      const matches: string[] = [];
      lines.forEach((line) => {
        const n = line.match(/^\/\/\s*@name\s+(.+)$/);
        const r = line.match(/^\/\/\s*@run-at\s+(.+)$/);
        const m = line.match(/^\/\/\s*@match\s+(.+)$/);
        if (n?.[1]) name = n[1].trim();
        if (r?.[1]) runAt = r[1].trim();
        if (m?.[1]) matches.push(m[1].trim());
      });
      return { name, runAt, matches: matches.length ? matches : ["*://*/*"] };
    };

    const withMeta = (source: string, meta: { name: string; runAt: string; matches: string[] }) => {
      const src = String(source || "");
      const blockRegex = /\/\/\s*==UserScript==[\s\S]*?\/\/\s*==\/UserScript==\n?/m;
      const nextBlock =
        "// ==UserScript==\n" +
        `// @name ${meta.name || "New Script"}\n` +
        (meta.matches.length ? meta.matches : ["*://*/*"]).map((match) => `// @match ${match}`).join("\n") +
        "\n" +
        `// @run-at ${meta.runAt || "document-end"}\n` +
        "// ==/UserScript==\n";
      if (blockRegex.test(src)) return src.replace(blockRegex, nextBlock);
      return nextBlock + src;
    };

    items = items.map((item) => {
      const parsed = parseMeta(item.source);
      return {
        ...item,
        name: item.name || parsed.name,
        matches: Array.isArray(item.matches) && item.matches.length ? item.matches : parsed.matches,
        runAt: item.runAt || parsed.runAt || "document-end",
      };
    });

    const close = (value: any) => {
      root.remove();
      document.removeEventListener("keydown", onKeyDown);
      resolve(value);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(items);
    };

    document.addEventListener("keydown", onKeyDown);
    root.addEventListener("click", () => close(items));
    panel.addEventListener("click", (event) => event.stopPropagation());

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "×";
    closeBtn.style.position = "absolute";
    closeBtn.style.top = "10px";
    closeBtn.style.right = "10px";
    closeBtn.style.width = "20px";
    closeBtn.style.height = "20px";
    closeBtn.style.display = "inline-flex";
    closeBtn.style.alignItems = "center";
    closeBtn.style.justifyContent = "center";
    closeBtn.style.border = "1px solid #cbd5e1";
    closeBtn.style.background = "#f8fafc";
    closeBtn.style.borderRadius = "4px";
    closeBtn.style.fontSize = "16px";
    closeBtn.style.color = "#334155";
    closeBtn.style.cursor = "pointer";
    closeBtn.onmouseenter = () => {
      closeBtn.style.background = "#e2e8f0";
      closeBtn.style.color = "#0f172a";
    };
    closeBtn.onmouseleave = () => {
      closeBtn.style.background = "#f8fafc";
      closeBtn.style.color = "#334155";
    };
    closeBtn.onclick = () => close(items);

    const left = document.createElement("div");
    left.style.borderRight = "1px solid #e2e8f0";
    left.style.padding = "12px";
    left.style.overflow = "auto";
    left.style.background = "#f8fafc";

    const right = document.createElement("div");
    right.style.padding = "12px";
    right.style.display = "flex";
    right.style.flexDirection = "column";
    right.style.gap = "10px";

    const renderList = () => {
      left.innerHTML = trustPolicy.createHTML("");
      const title = document.createElement("div");
      title.textContent = "UserScript Manager";
      title.style.fontWeight = "600";
      title.style.marginBottom = "8px";
      left.appendChild(title);

      const addBtn = document.createElement("button");
      addBtn.innerHTML = trustPolicy.createHTML(icon.plus + "<span>New Script</span>");
      applyButtonBase(addBtn);
      styleButton(addBtn, "#0f172a", "#1e293b", "#fff");
      addBtn.style.marginBottom = "8px";
      addBtn.onclick = () => {
        const item = {
          id: uid(),
          source:
            "// ==UserScript==\\n// @name New Script\\n// @match *://*/*\\n// @run-at document-end\\n// ==/UserScript==\\n",
          name: "New Script",
          matches: ["*://*/*"],
          runAt: "document-end",
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
        btn.style.display = "block";
        btn.style.width = "100%";
        btn.style.textAlign = "left";
        btn.style.marginBottom = "6px";
        btn.style.border = "1px solid #e2e8f0";
        btn.style.padding = "8px";
        btn.style.borderRadius = "8px";
        btn.style.cursor = "pointer";
        btn.style.background = selectedId === item.id ? "#e2e8f0" : "#fff";
        btn.innerHTML = trustPolicy.createHTML(
          `<div style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name || "Unnamed Script"}</div><div style="margin-top:2px;color:#475569;">${item.enabled ? "ON" : "OFF"} • ${item.runAt || "document-end"}</div>`,
        );
        btn.onclick = () => {
          selectedId = item.id;
          renderList();
          renderForm();
        };
        left.appendChild(btn);
      });
    };

    const renderForm = () => {
      right.innerHTML = trustPolicy.createHTML("");
      const selected = getSelected();
      const title = document.createElement("div");
      title.textContent = selected ? "Edit Script" : "Select Script";
      title.style.fontWeight = "600";
      right.appendChild(title);
      if (!selected) return;

      const nameInput = document.createElement("input");
      nameInput.value = selected.name || "";
      nameInput.placeholder = "Script name";
      nameInput.style.border = "1px solid #cbd5e1";
      nameInput.style.padding = "8px";
      nameInput.style.borderRadius = "8px";
      nameInput.style.fontSize = "12px";

      const matchWrap = document.createElement("div");
      matchWrap.style.display = "flex";
      matchWrap.style.flexDirection = "column";
      matchWrap.style.gap = "6px";

      const matchTitle = document.createElement("div");
      matchTitle.style.display = "flex";
      matchTitle.style.justifyContent = "space-between";
      matchTitle.style.alignItems = "center";
      matchTitle.innerHTML = trustPolicy.createHTML("<span>Match Rules</span>");
      const addMatch = document.createElement("button");
      addMatch.innerHTML = trustPolicy.createHTML(icon.plus + "<span>Rule</span>");
      applyButtonBase(addMatch);
      styleButton(addMatch, "#fff", "#f1f5f9", "#334155", "#cbd5e1");
      addMatch.onclick = () => {
        selected.matches = [...(selected.matches || ["*://*/*"]), ""];
        renderForm();
      };
      matchTitle.appendChild(addMatch);
      matchWrap.appendChild(matchTitle);

      (selected.matches || ["*://*/*"]).forEach((rule: string, index: number) => {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.gap = "6px";

        const input = document.createElement("input");
        input.value = rule;
        input.placeholder = "*://*/*";
        input.style.flex = "1";
        input.style.border = "1px solid #cbd5e1";
        input.style.padding = "7px";
        input.style.borderRadius = "8px";
        input.style.fontSize = "12px";
        input.oninput = () => {
          selected.matches[index] = input.value;
        };

        const remove = document.createElement("button");
        remove.innerHTML = trustPolicy.createHTML(icon.trash);
        applyButtonBase(remove);
        remove.style.width = "30px";
        remove.style.padding = "0";
        styleButton(remove, "#fee2e2", "#fecaca", "#b91c1c", "#fecaca");
        remove.onclick = () => {
          selected.matches = selected.matches.filter((_: string, idx: number) => idx !== index);
          if (!selected.matches.length) selected.matches = ["*://*/*"];
          renderForm();
        };

        row.appendChild(input);
        row.appendChild(remove);
        matchWrap.appendChild(row);
      });

      const row = document.createElement("div");
      row.style.display = "grid";
      row.style.gridTemplateColumns = "1fr auto";
      row.style.gap = "8px";

      const runAt = document.createElement("select");
      runAt.style.border = "1px solid #cbd5e1";
      runAt.style.padding = "8px";
      runAt.style.borderRadius = "8px";
      runAt.style.fontSize = "12px";
      ["document-start", "document-idle", "document-end"].forEach((value) => {
        const op = document.createElement("option");
        op.value = value;
        op.textContent = value;
        runAt.appendChild(op);
      });
      runAt.value = selected.runAt || "document-end";

      const switchBtn = document.createElement("button");
      applyButtonBase(switchBtn);
      switchBtn.style.minWidth = "66px";
      let enabledState = Boolean(selected.enabled);
      const updateSwitch = () => {
        switchBtn.textContent = enabledState ? "ON" : "OFF";
        styleButton(switchBtn, enabledState ? "#16a34a" : "#334155", enabledState ? "#15803d" : "#1e293b", "#fff");
      };
      updateSwitch();
      switchBtn.onclick = () => {
        enabledState = !enabledState;
        updateSwitch();
      };

      row.appendChild(runAt);
      row.appendChild(switchBtn);

      const area = document.createElement("textarea");
      area.value = selected.source || "";
      area.style.flex = "1";
      area.style.minHeight = "340px";
      area.style.border = "1px solid #cbd5e1";
      area.style.borderRadius = "8px";
      area.style.padding = "8px";
      area.style.fontSize = "12px";
      area.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.justifyContent = "space-between";
      actions.style.marginTop = "auto";

      const del = document.createElement("button");
      del.innerHTML = trustPolicy.createHTML(icon.trash + "<span>Delete</span>");
      applyButtonBase(del);
      styleButton(del, "#fee2e2", "#fecaca", "#b91c1c", "#fecaca");
      del.onclick = () => {
        items = items.filter((item) => item.id !== selected.id);
        selectedId = items[0] ? items[0].id : null;
        renderList();
        renderForm();
      };

      const rightActions = document.createElement("div");
      rightActions.style.display = "flex";
      rightActions.style.gap = "8px";

      const commitSelection = () => {
        selected.enabled = enabledState;
        selected.runAt = runAt.value || "document-end";
        selected.name = nameInput.value.trim() || "Unnamed Script";
        selected.matches = (selected.matches || ["*://*/*"]).map((m: string) => m.trim()).filter(Boolean);
        if (!selected.matches.length) selected.matches = ["*://*/*"];
        selected.source = withMeta(area.value, {
          name: selected.name,
          runAt: selected.runAt,
          matches: selected.matches,
        });
        area.value = selected.source;
      };

      const cancel = document.createElement("button");
      cancel.innerHTML = trustPolicy.createHTML(icon.x + "<span>Cancel</span>");
      applyButtonBase(cancel);
      styleButton(cancel, "#e2e8f0", "#cbd5e1", "#334155");
      cancel.onclick = () => close(null);

      const apply = document.createElement("button");
      apply.innerHTML = trustPolicy.createHTML(icon.check + "<span>Apply</span>");
      applyButtonBase(apply);
      styleButton(apply, "#0f172a", "#1e293b", "#fff");
      apply.onclick = () => {
        commitSelection();
        renderList();
      };

      const done = document.createElement("button");
      done.innerHTML = trustPolicy.createHTML(icon.disk + "<span>Done</span>");
      applyButtonBase(done);
      styleButton(done, "#4f46e5", "#4338ca", "#fff");
      done.onclick = () => {
        commitSelection();
        close(items);
      };

      rightActions.appendChild(cancel);
      rightActions.appendChild(apply);
      rightActions.appendChild(done);
      actions.appendChild(del);
      actions.appendChild(rightActions);

      right.appendChild(nameInput);
      right.appendChild(matchWrap);
      right.appendChild(row);
      right.appendChild(area);
      right.appendChild(actions);
    };

    panel.appendChild(closeBtn);
    panel.appendChild(left);
    panel.appendChild(right);
    root.appendChild(panel);
    document.documentElement.appendChild(root);
    renderList();
    renderForm();
  });
};

function getSafeDirname(): string {
  if (typeof __dirname !== "undefined") return __dirname;
  // @ts-ignore
  if (typeof import.meta?.dirname !== "undefined") return import.meta.dirname;
  // @ts-ignore
  if (typeof import.meta?.url !== "undefined") {
    // @ts-ignore
    return path.dirname(new URL(import.meta.url).pathname);
  }
  throw new Error("Cannot resolve __dirname in current module context");
}

function resolveUserScriptUrl(): string {
  if (
    // @ts-ignore
    typeof USERSCRIPT_INJECTION_VITE_DEV_SERVER_URL !== "undefined" &&
    // @ts-ignore
    USERSCRIPT_INJECTION_VITE_DEV_SERVER_URL
  ) {
    return (
      // @ts-ignore
      `${USERSCRIPT_INJECTION_VITE_DEV_SERVER_URL}`.replace(/\/$/, "") + "/"
    );
  }
  const basePath = path.join(
    getSafeDirname(),
    // @ts-ignore
    `../renderer/main_window/src/features/injection/apps/userscript/index.html`,
  );
  return pathToFileURL(basePath).toString();
}
const SENTINEL = "__USER_SCRIPT_RESOLVE__:";
export class UserScriptDialogServices {
  async openManager(win: BrowserWindow, tab: Tab, scripts: any[]) {
    try {
      const requestId = `userscript-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const userScriptUrl = resolveUserScriptUrl();
      const tabBounds = tab.view.getBounds();
      const userScriptView = new WebContentsView({
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: false,
        },
      });
      userScriptView.setBounds(tabBounds);
      userScriptView.setBackgroundColor("#00000000");
      win.contentView.addChildView(userScriptView);

      return new Promise<any[] | null>((resolve, reject) => {
        let isReady = false;
        const onConsoleMessage = (_event: any, _level: any, message: string) => {
          // console.log("onConsoleMessage level", _level);
          // console.log("onConsoleMessage message", message);
          if (!message.startsWith(SENTINEL)) return;
          try {
            const json = message.slice(SENTINEL.length);
            const data = JSON.parse(json);
            if (data?.requestId !== requestId) return;
            settle(Array.isArray(data.payload) ? data.payload : null);
          } catch {
            // Malformed — ignore, do NOT reject here.
          }
        };

        const onRenderProcessGone = () => {
          if (!isReady) {
            isReady = true;
            teardown(0);
            reject(new Error("user-script-view-render-process-gone"));
          }
        };

        const teardown = (delayMs: number) => {
          // Detach named listeners only — never removeAllListeners().
          userScriptView.webContents.off("console-message", onConsoleMessage);
          userScriptView.webContents.off("render-process-gone", onRenderProcessGone);
          clearTimeout(readyTimer);

          // Wait for the renderer's CSS fade-out to finish, then remove the view.
          // No executeJavaScript here — the view may already be closing.
          setTimeout(() => {
            try {
              win.contentView.removeChildView(userScriptView);
            } catch (_) {
              // View may already be removed if the window closed — safe to ignore.
            }
          }, delayMs);
        };

        const settle = (value: any[] | null) => {
          if (!isReady) return;
          // Signal the renderer to fade out (it handles its own CSS transition).
          // Fire-and-forget — we do NOT await or chain off this promise.
          if (!userScriptView.webContents.isDestroyed()) {
            userScriptView.webContents
              .executeJavaScript(`window.__userScriptClose && window.__userScriptClose();`)
              .catch(() => {});
          }
          // Tear down after the renderer's 120ms fade-out transition completes.
          teardown(150);
          resolve(value);
        };

        /**
         * Check and fallback Legacy Dialog on Time
         */
        const readyTimer = setTimeout(() => {
          if (!isReady) {
            isReady = true;
            teardown(0);
            reject(new Error("user-script-view-ready-timeout"));
          }
        }, 8000);

        userScriptView.webContents.on("console-message", onConsoleMessage);
        userScriptView.webContents.on("render-process-gone", onRenderProcessGone);
        userScriptView.webContents.once("did-finish-load", () => {
          if (isReady) return; // timeout already fired — do nothing
          isReady = true;

          const openPayload = JSON.stringify({
            requestId,
            items: scripts || [],
          });

          // This is a fire-and-forget executeJavaScript. We intentionally do
          // NOT attach a .catch() that calls reject() — delivery failure is
          // already covered by the readyTimer timeout path.
          const scriptToInject = `(async (data) => {
            const deliver = () => window.dispatchEvent(new CustomEvent("__userScriptOpen", { detail: data }));

            // Check immediately
            if (window.__userScriptReady) return deliver();

            // Wait for the 'ready' state using a MutationObserver or Polling
            // Polling is often more reliable for custom global flags
            const poll = setInterval(() => {
              if (window.__userScriptReady) {
                deliver();
                clearInterval(poll);
              }
            }, 50);

            // Auto-cleanup after 5 seconds to prevent memory leaks
            setTimeout(() => clearInterval(poll), 5000);
          })(${openPayload})`;

          userScriptView.webContents.executeJavaScript(scriptToInject).catch((err) => {
            console.log("error", err);
          });
        });

        userScriptView.webContents.loadURL(userScriptUrl).catch((err) => {
          if (!isReady) {
            isReady = true;
            teardown(0);
            reject(err);
          }
        });
      });
    } catch (error) {
      console.log("user script error", error);
      const fallback = `(${openUserScriptManagerDialog.toString()})(${JSON.stringify(scripts || [])});`;
      return (await tab.webContents.executeJavaScript(fallback, true)) as any[];
    }
  }
}
