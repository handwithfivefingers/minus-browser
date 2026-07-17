import { useEffect, useState } from "react";
import { PermissionDecision, PermissionType, SitePermissions } from "~/shared/types";
import { getPermissionLabel } from "~/renderer/main-window/src/stores/usePermissionStore";

interface SiteEntry {
  origin: string;
  permissions: SitePermissions;
}

export const SiteSettings = () => {
  const [sites, setSites] = useState<SiteEntry[]>([]);
  const [search, setSearch] = useState("");

  const loadSites = async () => {
    const allOrigins = await window.api.INVOKE<string[]>("GET_SITE_PERMISSIONS", { all: true });
    const entries: SiteEntry[] = [];
    for (const origin of allOrigins) {
      const perms = await window.api.INVOKE<SitePermissions>("GET_SITE_PERMISSIONS", { origin });
      if (perms && Object.keys(perms).length > 0) {
        entries.push({ origin, permissions: perms });
      }
    }
    setSites(entries);
  };

  useEffect(() => {
    loadSites();
  }, []);

  const handleTogglePermission = async (origin: string, permission: PermissionType, decision: PermissionDecision) => {
    await window.api.INVOKE("SET_SITE_PERMISSION", { origin, permission, decision });
    loadSites();
  };

  const handleResetSite = async (origin: string) => {
    await window.api.INVOKE("RESET_SITE_PERMISSION", { origin, permission: "*" });
    setSites((prev) => prev.filter((s) => s.origin !== origin));
  };

  const handleResetAll = async () => {
    await window.api.INVOKE("RESET_ALL_PERMISSIONS");
    setSites([]);
  };

  const filteredSites = sites.filter((site) => {
    if (!search.trim()) return true;
    const hostname = (() => {
      try {
        return new URL(site.origin).hostname.toLowerCase();
      } catch {
        return site.origin.toLowerCase();
      }
    })();
    return hostname.includes(search.trim().toLowerCase());
  });

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Site Settings</h2>
        <div className="flex items-center gap-3">
          {sites.length > 0 && (
            <input
              type="text"
              placeholder="Search by domain..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs border border-slate-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-400 w-48"
            />
          )}
          {sites.length > 0 && (
            <button
              type="button"
              onClick={handleResetAll}
              className="text-xs text-red-500 hover:text-red-700 cursor-pointer bg-transparent border-none px-2 py-1"
            >
              Reset all permissions
            </button>
          )}
        </div>
      </div>

      {filteredSites.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          {search ? "No sites match your search." : "No sites have custom permissions yet."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredSites.map((site) => (
            <div key={site.origin} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                    {(() => {
                      try {
                        return new URL(site.origin).hostname.charAt(0).toUpperCase();
                      } catch {
                        return site.origin.charAt(0).toUpperCase();
                      }
                    })()}
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {(() => {
                      try {
                        return new URL(site.origin).hostname;
                      } catch {
                        return site.origin;
                      }
                    })()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleResetSite(site.origin)}
                  className="text-[10px] text-slate-400 dark:text-slate-500 hover:text-red-500 cursor-pointer bg-transparent border-none"
                >
                  Reset
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {Object.entries(site.permissions).map(([perm, decision]) => (
                  <div key={perm} className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-600 dark:text-slate-400">{getPermissionLabel(perm as PermissionType)}</span>
                    <select
                      value={decision}
                      onChange={(e) =>
                        handleTogglePermission(site.origin, perm as PermissionType, e.target.value as PermissionDecision)
                      }
                      className="text-xs border border-slate-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <option value="grant">Allow</option>
                      <option value="deny">Block</option>
                      <option value="prompt">Ask</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
