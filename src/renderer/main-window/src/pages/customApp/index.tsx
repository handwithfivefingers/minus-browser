import { IconInnerShadowTopLeft } from "@tabler/icons-react";
import { TabErrorPage } from "~/renderer/main-window/src/components/tab/TabErrorPage";
import { lazy, useEffect, useRef, useState } from "react";
import { Navigate, useParams } from "react-router";
import { ITab } from "~/shared/types";
import { useContentView } from "../../hooks/useContentView";
import { Tab } from "../../interfaces";
import { debounce, navigateOrSearch } from "../../libs";
import { tabServices } from "../../services/tab.service";
import { useMinusThemeStore } from "../../stores/useMinusTheme";
import { useTabStore } from "../../stores/useTabStore";
import { IPC_INVOKE_CHANNEL } from "~/shared/constants/ipc";

const Header = lazy(() => import("~/renderer/main-window/src/components/header"));

const LAYOUT_HEADER_CLASS = {
  BASIC: "h-screen relative overflow-hidden w-full flex flex-col",
  FLOATING: "h-[calc(100svh-8px)] rounded-md relative overflow-hidden w-full flex flex-col gap-1",
};
const WEBVIEW_CLASSES = {
  BASIC: "h-[calc(100vh-34px)] relative overflow-hidden",
  FLOATING: "h-[calc(100vh-46px)] rounded-md relative overflow-hidden",
};

interface IPasswordVaultItem {
  id: string;
  site: string;
  username: string;
  password: string;
  notes?: string;
}

interface IDetectedCredentialPayload {
  tabId: string;
  username?: string;
  password?: string;
  url?: string;
}

interface IPendingCredentialSave {
  site: string;
  username: string;
  password: string;
}

interface ITranslatePreference {
  sourceLanguage: string;
  targetLanguage: string;
  autoTranslate: boolean;
  alwaysTranslateDomains: string[];
  neverTranslateDomains: string[];
  neverTranslateLanguages: string[];
}

const CustomApp = () => {
  const { customApp: tabId = "" } = useParams<{ customApp: string }>();
  const { layout } = useMinusThemeStore();
  const [loading, setLoading] = useState(false);
  const handledCredentialRef = useRef<Set<string>>(new Set());
  const latestSelectionRef = useRef<string>("");
  const tab = useTabStore((s) => s.tabs.find((t) => t.id === tabId));
  const updateTab = useTabStore((s) => s.updateTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  useEffect(() => {
    setActiveTab(tabId);
    getScreenData();
    tabServices.subscribeTab<ITab>(tabId, (tab) => {
      updateTab(tabId, tab);
    });
    // window.api.LISTENER("ON_RELOAD", onReload);
    window.api.LISTENER(`LOADING:${tabId}`, onTabNavigate);
    window.api.LISTENER("VAULT_CREDENTIAL_DETECTED", onCredentialDetected);
    window.api.LISTENER("FILL_PASSWORD_REQUEST", onFillPasswordRequest);
    window.api.LISTENER("TRANSLATE_LANGUAGE_DETECTED", onTranslateLanguageDetected);
    window.api.LISTENER("TRANSLATE_SELECTION_AVAILABLE", onTranslateSelectionAvailable);
  }, [tabId]);

  // const onHandleReceiveCreateTabEvent = (payload: {url:string}) => {
  // }

  const onTabNavigate = (isLoading: boolean) => {
    setLoading(isLoading);
  };

  const handleSearch = async (url: string) => {
    try {
      const outputFormat = navigateOrSearch(url);
      updateTab(tabId, { url: outputFormat, error: null });
      window.api.EMIT("VIEW_CHANGE_URL", { id: tabId, url: outputFormat });
    } catch (error) {
      console.error("VIEW_CHANGE_URL error", error);
    }
  };

  const handleRetry = async () => {
    if (!tab?.error?.url) return;
    await handleSearch(tab.error.url);
  };

  const handleGoHome = async () => {
    await handleSearch("https://google.com");
  };

  const onBackWard = async () => {
    try {
      return window.api.EMIT("ON_BACKWARD", { data: tab });
    } catch (error) {
      console.error("onBackWard error", error);
    }
  };

  const onToggleDevTools = async () => {
    try {
      window.api.EMIT("TOGGLE_DEV_TOOLS", { id: tabId });
    } catch (error) {
      console.error("onToggleDevTools error", error);
    }
  };

  const onReload = async () => {
    try {
      window.api.EMIT("ON_RELOAD", tab);
    } catch (error) {
      console.error("onToggleDevTools error", error);
    }
  };

  const onRequestPIP = async () => {
    window.api.EMIT("REQUEST_PIP", { tab });
  };

  const onFillPassword = async () => {
    try {
      const credentials = await window.api.INVOKE<IPasswordVaultItem[]>("VAULT_LIST");
      if (!credentials?.length) return;
      const currentUrl = tab?.url || "";
      const host = (() => {
        try {
          return new URL(currentUrl).hostname.toLowerCase();
        } catch (error) {
          return "";
        }
      })();
      const matchedCredentials = credentials.filter((item) => {
        const site = (item.site || "").toLowerCase();
        return site && host && (host.includes(site) || site.includes(host));
      });
      if (!matchedCredentials.length) return;
      const candidateList = matchedCredentials;
      let selected = candidateList[0];
      if (candidateList.length > 1) {
        const selectedId = await window.api.INVOKE<string | null>("VAULT_SELECT_CREDENTIAL", {
          tabId,
          candidates: candidateList.map((item) => ({
            id: item.id,
            username: item.username,
            site: item.site,
          })),
        });
        selected = candidateList.find((item) => item.id === selectedId) || candidateList[0];
      }
      if (!selected) return;
      await fillByCredential(selected);
    } catch (error) {
      console.error("onFillPassword error", error);
    }
  };

  const onFillPasswordRequest = (payload: { tabId: string }) => {
    if (!payload?.tabId || payload.tabId !== tabId) return;
    onFillPassword();
  };

  const onOpenVaultManager = async () => {
    try {
      await window.api.INVOKE("VAULT_OPEN_MANAGER", { tabId });
    } catch (error) {
      console.error("onOpenVaultManager error", error);
    }
  };

  const onOpenUserscriptManager = async () => {
    try {
      await window.api.INVOKE("USERSCRIPT_OPEN_MANAGER", { tabId });
    } catch (error) {
      console.error("onOpenUserscriptManager error", error);
    }
  };

  const onTranslatePage = async () => {
    try {
      await window.api.INVOKE("TRANSLATE_PAGE", { tabId });
    } catch (error) {
      console.error("onTranslatePage error", error);
    }
  };

  const onOpenTranslateManager = async () => {
    try {
      await window.api.INVOKE("TRANSLATE_OPEN_MANAGER", { tabId });
    } catch (error) {
      console.error("onOpenTranslateManager error", error);
    }
  };

  const onTranslateSelection = async () => {
    try {
      const selectedText = latestSelectionRef.current?.trim() || undefined;
      await window.api.INVOKE("TRANSLATE_SELECTION", {
        tabId,
        text: selectedText,
      });
    } catch (error) {
      console.error("onTranslateSelection error", error);
    }
  };

  const fillByCredential = async (credential: IPasswordVaultItem) => {
    if (!credential) return;
    await window.api.INVOKE("VAULT_FILL", {
      tabId,
      credentialId: credential.id,
    });
  };

  const onCredentialDetected = async (payload: IDetectedCredentialPayload) => {
    try {
      if (!payload || payload.tabId !== tabId) return;
      if (!payload.password?.trim()) return;
      const site = (() => {
        try {
          return new URL(payload.url || tab?.url || "").hostname.toLowerCase();
        } catch (error) {
          return "";
        }
      })();
      if (!site) return;
      const cacheKey = `${payload.tabId}:${site}:${payload.username || ""}:${payload.password}`;
      if (handledCredentialRef.current.has(cacheKey)) return;
      handledCredentialRef.current.add(cacheKey);
      const pendingCredentialSave: IPendingCredentialSave = {
        site,
        username: (payload.username || "").trim() || "unknown",
        password: payload.password,
      };
      const existingVault = await window.api.INVOKE<IPasswordVaultItem[]>("VAULT_LIST");
      const existing = existingVault.find(
        (item) =>
          item.site.toLowerCase() === pendingCredentialSave.site &&
          item.username.trim().toLowerCase() === pendingCredentialSave.username.trim().toLowerCase(),
      );
      if (existing && existing.password === pendingCredentialSave.password) return;
      const shouldSave = await window.api.INVOKE<boolean>("VAULT_CONFIRM_SAVE", {
        tabId,
        username: pendingCredentialSave.username,
        site: pendingCredentialSave.site,
        isUpdate: !!existing,
      });
      if (!shouldSave) return;
      if (existing) {
        await window.api.INVOKE("VAULT_UPDATE", {
          id: existing.id,
          patch: {
            password: pendingCredentialSave.password,
          },
        });
      } else {
        await window.api.INVOKE("VAULT_ADD", {
          site: pendingCredentialSave.site,
          username: pendingCredentialSave.username,
          password: pendingCredentialSave.password,
        });
      }
    } catch (error) {
      console.error("onCredentialDetected error", error);
    }
  };

  const onTranslateLanguageDetected = async (payload: { tabId?: string; language?: string; url?: string }) => {
    if (!payload || payload.tabId !== tabId) return;
    if (!payload.language) return;
    try {
      const domain = (() => {
        try { return new URL(payload.url || tab?.url || "").hostname; } catch { return ""; }
      })();
      const shouldAuto = await window.api.INVOKE<boolean>("TRANSLATE_SHOULD_AUTO", {
        domain,
        language: payload.language,
      });
      if (!shouldAuto) return;
      await window.api.INVOKE("TRANSLATE_SHOW_PROMPT", { language: payload.language });
    } catch (error) {
      console.error("onTranslateLanguageDetected error", error);
    }
  };

  const onTranslateSelectionAvailable = (payload: { tabId?: string; text?: string }) => {
    if (payload?.tabId && payload.tabId !== tabId) return;
    latestSelectionRef.current = String(payload.text || "").trim();
    onTranslateSelection();
  };

  const getScreenData = async () => {
    const tab = await window.api.INVOKE<Tab>("GET_TAB", { id: tabId });
    updateTab(tabId, tab);
  };
  if (!tabId) return <Navigate to={"/"} />;
  return (
    <div className={LAYOUT_HEADER_CLASS[layout as keyof typeof LAYOUT_HEADER_CLASS]}>
      <Header
        key={tabId}
        id={tabId}
        title={tab?.title}
        url={tab?.url}
        isBookmarked={tab?.isBookmarked}
        onSearch={handleSearch}
        onBackWard={onBackWard}
        onToggleDevTools={onToggleDevTools}
        onReload={onReload}
        onRequestPIP={onRequestPIP}
        onOpenVaultManager={onOpenVaultManager}
        onOpenUserscriptManager={onOpenUserscriptManager}
        onTranslatePage={onTranslatePage}
        onOpenTranslateManager={onOpenTranslateManager}
        onOpenSpotlight={(query) => window.api.EMIT("SPOTLIGHT_OPEN", { query, activeTabId: tabId })}
        isLoading={loading}
        preventHibernate={tab?.preventHibernate}
        onTogglePreventHibernate={() => window.api.INVOKE("TOGGLE_PREVENT_HIBERNATE", { id: tabId })}
        onCapturePage={() => window.api.INVOKE(IPC_INVOKE_CHANNEL.CAPTURE_PAGE)}
        onCaptureSelection={() => window.api.INVOKE(IPC_INVOKE_CHANNEL.CAPTURE_SELECTION)}
      />
      {tab?.error ? (
        <TabErrorPage error={tab.error} onRetry={handleRetry} onGoHome={handleGoHome} />
      ) : (
        <WebViewInstance id={tabId} />
      )}
    </div>
  );
};

const WebViewInstance = ({ id }: { id: string }) => {
  const webviewRef = useRef<HTMLDivElement | null>(null);
  const { showViewByID } = useContentView();
  const { layout } = useMinusThemeStore();

  useEffect(() => {
    if (!webviewRef.current) return;
    if (!id) return;
    getContentView({ id });
    const autoSize = debounce(() => {
      if (!webviewRef.current) return;
      const { x, y, width, height } = webviewRef.current.getBoundingClientRect();
      window.api.EMIT("VIEW_RESPONSIVE", {
        tab: { id },
        screen: { x, y, width, height },
      });
    }, 25);
    const resizeObserver = new ResizeObserver(autoSize);
    resizeObserver?.observe(webviewRef.current);
    return () => {
      id && window.api.EMIT("HIDE_VIEW", { id });
      webviewRef.current && resizeObserver?.unobserve(webviewRef.current as Element);
    };
  }, [id]);

  const getContentView = async (tab: Partial<Tab>) => {
    try {
      if (!webviewRef.current) return;
      const { x, y, width, height } = webviewRef.current.getBoundingClientRect();
      const screen = { x, y, width, height };
      const data = { screen, tab: tab };
      await showViewByID(data);
    } catch (error) {
      console.error("error", error);
    }
  };
  useEffect(() => {
    window.api.LISTENER("TOGGLE_DEV_TOOLS", () => {
      window.api.EMIT("TOGGLE_DEV_TOOLS", { id });
    });
  }, []);

  return (
    <div className={WEBVIEW_CLASSES[layout as keyof typeof WEBVIEW_CLASSES]}>
      <div
        className="mx-auto absolute z-0 left-0 top-0 w-full h-full flex justify-center items-center mt-auto bg-slate-200"
        ref={webviewRef}
      >
        <IconInnerShadowTopLeft className="animate-spin" />
      </div>
    </div>
  );
};

export default CustomApp;
