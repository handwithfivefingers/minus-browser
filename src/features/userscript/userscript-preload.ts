import { contextBridge, ipcRenderer } from "electron";

declare class TrustedScript {}
declare const trustedTypes: {
  createPolicy: (
    name: string,
    rules: { createScript: (s: string) => string },
  ) => {
    createScript: (s: string) => TrustedScript;
  };
};

interface ScriptPayload {
  id: string;
  name: string;
  source: string;
  grants: string[];
  runAt: string;
  noframes: boolean;
  requires: Array<{ url: string; content?: string }>;
  resources: Array<{
    name: string;
    url: string;
    content?: string;
    contentType?: string;
  }>;
}

interface BridgeAPI {
  getValue: (scriptId: string, key: string, defaultValue?: any) => Promise<any>;
  setValue: (scriptId: string, key: string, value: any) => Promise<void>;
  deleteValue: (scriptId: string, key: string) => Promise<void>;
  listValues: (scriptId: string) => Promise<string[]>;
  xmlHttpRequest: (scriptId: string, details: any) => Promise<any>;
  notification: (scriptId: string, details: any) => Promise<any>;
  setClipboard: (scriptId: string, data: string, info?: any) => Promise<void>;
  openInTab: (scriptId: string, url: string, options?: any) => Promise<any>;
  getTab: (scriptId: string) => Promise<any>;
  saveTab: (scriptId: string, obj: any) => Promise<void>;
  getTabs: (scriptId: string) => Promise<Record<string, any>>;
  download: (scriptId: string, options: any) => Promise<any>;
  getResourceText: (scriptId: string, name: string) => Promise<string | undefined>;
  getResourceURL: (scriptId: string, name: string) => Promise<string | undefined>;
  log: (scriptId: string, ...args: any[]) => Promise<void>;
  reportError: (scriptId: string, scriptName: string, message: string, stack?: string, url?: string) => void;
}

let requestCounter = 0;

function sendGMRequest(scriptId: string, method: string, ...args: any[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const requestId = `gm_${++requestCounter}_${Date.now()}`;

    const onResponse = (_event: any, response: any) => {
      if (response.requestId === requestId) {
        ipcRenderer.removeListener("GM:RESPONSE", onResponse);
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error));
        }
      }
    };

    ipcRenderer.on("GM:RESPONSE", onResponse);

    ipcRenderer.send("GM:REQUEST", {
      requestId,
      scriptId,
      method,
      args,
    });
  });
}

const bridgeAPI: BridgeAPI = {
  getValue: (scriptId, key, defaultValue?) => sendGMRequest(scriptId, "GM_getValue", key, defaultValue),
  setValue: (scriptId, key, value) => sendGMRequest(scriptId, "GM_setValue", key, value),
  deleteValue: (scriptId, key) => sendGMRequest(scriptId, "GM_deleteValue", key),
  listValues: (scriptId) => sendGMRequest(scriptId, "GM_listValues"),
  xmlHttpRequest: (scriptId, details) => sendGMRequest(scriptId, "GM_xmlhttpRequest", details),
  notification: (scriptId, details) => sendGMRequest(scriptId, "GM_notification", details),
  setClipboard: (scriptId, data, info?) => sendGMRequest(scriptId, "GM_setClipboard", data, info),
  openInTab: (scriptId, url, options?) => sendGMRequest(scriptId, "GM_openInTab", url, options),
  getTab: (scriptId) => sendGMRequest(scriptId, "GM_getTab"),
  saveTab: (scriptId, obj) => sendGMRequest(scriptId, "GM_saveTab", obj),
  getTabs: (scriptId) => sendGMRequest(scriptId, "GM_getTabs"),
  download: (scriptId, options) => sendGMRequest(scriptId, "GM_download", options),
  getResourceText: (scriptId, name) => sendGMRequest(scriptId, "GM_getResourceText", name),
  getResourceURL: (scriptId, name) => sendGMRequest(scriptId, "GM_getResourceURL", name),
  log: (scriptId, ...args) => sendGMRequest(scriptId, "GM_log", ...args),
  reportError: (scriptId, scriptName, message, stack?, url?) => {
    ipcRenderer.send("USERSCRIPT_REPORT_ERROR", {
      scriptId,
      scriptName,
      message,
      stack,
      url: url || window.location.href,
    });
  },
};

contextBridge.exposeInMainWorld("__userscript_bridge__", bridgeAPI);

function generateWrapper(script: ScriptPayload): string {
  const grantMap: Record<string, string> = {};
  const sid = JSON.stringify(script.id);
  const sname = JSON.stringify(script.name);

  const hasGrant = (api: string): boolean => {
    if (!script.grants || script.grants.length === 0) return true;
    if (script.grants.includes("none")) return false;
    return script.grants.includes(api);
  };

  if (hasGrant("unsafeWindow")) {
    grantMap["unsafeWindow"] = "window";
  }
  if (hasGrant("GM_info")) {
    grantMap["GM_info"] = `{
      script: {
        id: ${sid},
        name: ${sname},
        namespace: null,
        version: null,
        description: null,
        author: null,
        matches: [],
        excludes: [],
        includes: [],
        resources: ${JSON.stringify(script.resources)},
        grants: ${JSON.stringify(script.grants)},
        runAt: ${JSON.stringify(script.runAt)},
        noframes: null,
        icon: null,
        downloadURL: null,
        updateURL: null,
        supportURL: null,
        homepageURL: null,
        license: null,
        installURL: null,
      },
      scriptMetaStr: null,
      scriptWillUpdate: false,
      version: "1.0.0",
      platform: {
        arch: navigator.platform,
        browserName: "Electron",
        browserVersion: navigator.userAgent,
        os: navigator.platform,
        platform: navigator.platform,
        userAgent: navigator.userAgent,
      },
    }`;
  }

  const gmAPIs: Array<{ api: string; bridge: string | null }> = [
    { api: "GM_getValue", bridge: "getValue" },
    { api: "GM_setValue", bridge: "setValue" },
    { api: "GM_deleteValue", bridge: "deleteValue" },
    { api: "GM_listValues", bridge: "listValues" },
    { api: "GM_xmlhttpRequest", bridge: "xmlHttpRequest" },
    { api: "GM.xmlHttpRequest", bridge: "xmlHttpRequest" },
    { api: "GM_notification", bridge: "notification" },
    { api: "GM.notification", bridge: "notification" },
    { api: "GM_setClipboard", bridge: "setClipboard" },
    { api: "GM.setClipboard", bridge: "setClipboard" },
    { api: "GM_openInTab", bridge: "openInTab" },
    { api: "GM.openInTab", bridge: "openInTab" },
    { api: "GM_getTab", bridge: "getTab" },
    { api: "GM.getTab", bridge: "getTab" },
    { api: "GM_saveTab", bridge: "saveTab" },
    { api: "GM.saveTab", bridge: "saveTab" },
    { api: "GM_getTabs", bridge: "getTabs" },
    { api: "GM.getTabs", bridge: "getTabs" },
    { api: "GM_download", bridge: "download" },
    { api: "GM.download", bridge: "download" },
    { api: "GM_getResourceText", bridge: "getResourceText" },
    { api: "GM.getResourceText", bridge: "getResourceText" },
    { api: "GM_getResourceURL", bridge: "getResourceURL" },
    { api: "GM.getResourceURL", bridge: "getResourceURL" },
    { api: "GM_log", bridge: "log" },
    { api: "GM.log", bridge: "log" },
    { api: "GM_addStyle", bridge: null },
    { api: "GM.addStyle", bridge: null },
    { api: "GM_addElement", bridge: null },
    { api: "GM.addElement", bridge: null },
  ];

  for (const { api, bridge } of gmAPIs) {
    if (!hasGrant(api)) continue;
    if (bridge === null) {
      grantMap[api] = `(...args) => window.__userscript_bridge__?.log(${sid}, ...args)`;
      continue;
    }
    grantMap[api] =
      `(...args) => { const b = window.__userscript_bridge__?.${bridge}; return b ? b(${sid}, ...args) : undefined; }`;
  }

  const grantDeclarations = Object.entries(grantMap)
    .filter(([key]) => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key))
    .filter(([key]) => key !== "unsafeWindow" || !script.grants || script.grants.includes("unsafeWindow"))
    .map(([key, value]) => `const ${key} = ${value};`)
    .join("\n  ");

  const requireFetchCode =
    script.requires.length > 0
      ? script.requires
          .map(
            (r, i) => `
    (async () => {
      try {
        const res_${i} = await fetch(${JSON.stringify(r.url)});
        const text_${i} = await res_${i}.text();
        (new Function(text_${i}))();
      } catch(e) { console.error("Failed to load @require:", ${JSON.stringify(r.url)}, e); }
    })();`,
          )
          .join("\n")
      : "";

  return `
(function() {
  if (window["__userscript_injected_${script.id}"]) return;
  window["__userscript_injected_${script.id}"] = true;

  ${grantDeclarations}

  const __reportError = (message, stack) => {
    try { window.__userscript_bridge__?.reportError(${sid}, ${sname}, message, stack); } catch {}
  };

  ${
    requireFetchCode
      ? `Promise.resolve().then(() => { ${requireFetchCode} }).then(() => {\n    try {\n      ${script.source}\n    } catch(e) { __reportError(e.message || String(e), e.stack); }\n  }).catch(e => { console.error("UserScript require error [${script.name}]", e); __reportError(e.message || String(e), e.stack); });`
      : `
  try {
    ${script.source}
  } catch(e) {
    console.error("UserScript error [${script.name}]", e);
    __reportError(e.message || String(e), e.stack);
  }`
  }
})();
`;
}

function injectScript(code: string): void {
  const script = document.createElement("script");
  script.setAttribute("type", "text/javascript");

  if (typeof trustedTypes !== "undefined" && trustedTypes.createPolicy) {
    try {
      const policy = trustedTypes.createPolicy("userscript", {
        createScript: (s: string) => s,
      });
      script.textContent = policy.createScript(code) as unknown as string;
      document.documentElement?.appendChild(script);
      return;
    } catch {
      // policy creation failed (page restricts policy names) — fall through
    }
  }

  script.textContent = code;
  document.documentElement?.appendChild(script);
}

async function main(): Promise<void> {
  if (window === window.top) {
    try {
      const url = window.location.href;
      const result: { scripts: ScriptPayload[] } = await ipcRenderer.invoke("invoke", {
        channel: "USERSCRIPT_GET_MATCHING_SCRIPTS",
        data: { url },
      });

      const scripts = result?.scripts || [];
      for (const script of scripts) {
        const wrapper = generateWrapper(script);

        switch (script.runAt) {
          case "document-end":
            if (document.readyState === "loading") {
              document.addEventListener("DOMContentLoaded", () => injectScript(wrapper), { once: true });
            } else {
              injectScript(wrapper);
            }
            break;
          case "document-idle":
            if (document.readyState === "complete") {
              injectScript(wrapper);
            } else {
              window.addEventListener("load", () => injectScript(wrapper), {
                once: true,
              });
            }
            break;
          case "document-start":
          default:
            injectScript(wrapper);
            break;
        }
      }
    } catch (error) {
      console.error("[UserScript Preload] Error:", error);
    }
  }
}

main().catch(() => {});
