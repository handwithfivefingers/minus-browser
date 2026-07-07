import { StoreManager } from "~/core/stores";
import { PermissionDecision, PermissionType, SitePermissions } from "~/shared/types";

export class PermissionStore {
  private store: StoreManager = new StoreManager("permission");
  private permissions: Record<string, SitePermissions> = {};

  async initialize() {
    try {
      const data = await this.store.readFiles<Record<string, SitePermissions>>();
      if (data && typeof data === "object" && !Array.isArray(data)) {
        this.permissions = data;
      }
    } catch {
      this.permissions = {};
    }
  }

  getSitePermission(origin: string, permission: PermissionType): PermissionDecision {
    return this.permissions[origin]?.[permission] || "prompt";
  }

  getSitePermissions(origin: string): SitePermissions {
    return this.permissions[origin] || {};
  }

  setSitePermission(origin: string, permission: PermissionType, decision: PermissionDecision) {
    if (!this.permissions[origin]) {
      this.permissions[origin] = {};
    }
    this.permissions[origin][permission] = decision;
    this.save();
  }

  resetSitePermission(origin: string, permission: PermissionType | "*") {
    if (permission === "*") {
      delete this.permissions[origin];
      this.save();
      return;
    }
    if (this.permissions[origin]) {
      delete this.permissions[origin][permission];
      if (Object.keys(this.permissions[origin]).length === 0) {
        delete this.permissions[origin];
      }
      this.save();
    }
  }

  resetAllPermissions() {
    this.permissions = {};
    this.save();
  }

  getAllSites(): string[] {
    return Object.keys(this.permissions);
  }

  private save() {
    this.store.saveFiles(this.permissions);
  }
}

export const permissionStore = new PermissionStore();
