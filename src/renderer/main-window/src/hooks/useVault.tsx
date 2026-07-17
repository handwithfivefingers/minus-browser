import { useEffect, useRef } from "react";
import { Tab } from "../interfaces";
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
interface IPasswordVaultItem {
  id: string;
  site: string;
  username: string;
  password: string;
  notes?: string;
}

export const useVault = (tab?: Tab) => {
  const handledCredentialRef = useRef<Set<string>>(new Set());
  const onCredentialDetected = async (payload: IDetectedCredentialPayload) => {
    try {
      if (!payload || payload.tabId !== tab?.id) return;
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
        tabId: tab?.id,
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

  const onFillPasswordRequest = (payload: { tabId: string }) => {
    if (!payload?.tabId || payload.tabId !== tab?.id) return;
    onFillPassword();
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
          tabId: tab?.id,
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
  const fillByCredential = async (credential: IPasswordVaultItem) => {
    if (!credential) return;
    await window.api.INVOKE("VAULT_FILL", {
      tabId: tab?.id,
      credentialId: credential.id,
    });
  };

  const onOpenVaultManager = async () => {
    try {
      await window.api.INVOKE("VAULT_OPEN_MANAGER", { tabId: tab?.id });
    } catch (error) {
      console.error("onOpenVaultManager error", error);
    }
  };

  useEffect(() => {
    window.api.LISTENER("VAULT_CREDENTIAL_DETECTED", onCredentialDetected);
    window.api.LISTENER("FILL_PASSWORD_REQUEST", onFillPasswordRequest);
  }, [tab?.id]);
  return {
    onOpenVaultManager,
  };
};
