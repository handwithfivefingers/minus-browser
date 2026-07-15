import { PermissionDecision, PermissionType, SitePermissions } from "~/shared/types";
import { appDb } from "~/main/core/stores";

export class PermissionStore {
  private permissions: Record<string, SitePermissions> = {};

  async initialize() {
    try {
      const rows = appDb.query<{ origin: string; permission: string; decision: string }>(
        "SELECT origin, permission, decision FROM permissions",
      );
      this.permissions = {};
      for (const row of rows) {
        if (!this.permissions[row.origin]) {
          this.permissions[row.origin] = {};
        }
        this.permissions[row.origin][row.permission] = row.decision as PermissionDecision;
      }
    } catch {
      this.permissions = {};
    }
  }

  getSitePermission(origin: string, permission: PermissionType): PermissionDecision {
    const result = appDb.get<{ decision: string }>(
      "SELECT decision FROM permissions WHERE origin = ? AND permission = ?",
      [origin, permission],
    );
    return (result?.decision as PermissionDecision) || "prompt";
  }

  getSitePermissions(origin: string): SitePermissions {
    const rows = appDb.query<{ permission: string; decision: string }>(
      "SELECT permission, decision FROM permissions WHERE origin = ?",
      [origin],
    );
    const perms: SitePermissions = {};
    for (const row of rows) {
      perms[row.permission] = row.decision as PermissionDecision;
    }
    return perms;
  }

  setSitePermission(origin: string, permission: PermissionType, decision: PermissionDecision) {
    appDb.run(
      "INSERT OR REPLACE INTO permissions (origin, permission, decision) VALUES (?, ?, ?)",
      [origin, permission, decision],
    );
  }

  resetSitePermission(origin: string, permission: PermissionType | "*") {
    if (permission === "*") {
      appDb.run("DELETE FROM permissions WHERE origin = ?", [origin]);
      return;
    }
    appDb.run("DELETE FROM permissions WHERE origin = ? AND permission = ?", [origin, permission]);
  }

  resetAllPermissions() {
    appDb.run("DELETE FROM permissions");
  }

  getAllSites(): string[] {
    const rows = appDb.query<{ origin: string }>(
      "SELECT DISTINCT origin FROM permissions",
    );
    return rows.map((r) => r.origin);
  }
}

export const permissionStore = new PermissionStore();
