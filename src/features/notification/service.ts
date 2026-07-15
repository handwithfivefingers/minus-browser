import { BrowserWindow, ipcMain, Notification } from "electron";
import { useWebNotificationStore } from "~/shared/store/useNotificationStore";
import { WebNotification } from "~/shared/types/notification";
import { NotificationViewService } from "./view/viewService";
export class NotificationService {
  private mainWindow: BrowserWindow | null = null;
  private store = useWebNotificationStore;
  private viewService = new NotificationViewService();
  private isFocused = true;
  private retentionDays = 30;
  private checkPermission: ((tabId: string) => boolean) | null = null;

  init(mainWindow: BrowserWindow, retentionDays?: number, checkPermission?: (tabId: string) => boolean) {
    this.mainWindow = mainWindow;
    this.retentionDays = retentionDays ?? 30;
    this.checkPermission = checkPermission ?? null;
    this.viewService.init(mainWindow);
    this.viewService.setCallbacks({
      onNavigateToTab: (tabId) => this.handleOpenTabById(tabId),
      getHistory: () => this.store.getState().notifications,
      onStateChange: () => this.syncStateToRenderer(),
    });

    this.store.getState().prune(this.retentionDays);
    this.registerNotificationHandler();
    this.registerFocusHandlers();
  }

  setRetentionDays(days: number) {
    this.retentionDays = days;
    this.store.getState().prune(this.retentionDays);
  }

  private registerNotificationHandler() {
    ipcMain.on(
      "WEB_NOTIFICATION",
      (
        _event,
        data: {
          tabId: string;
          title: string;
          body: string;
          tag: string;
          tabTitle?: string;
          favicon?: string;
        },
      ) => {
        this.handleIncomingNotification(data);
      },
    );
  }

  private registerFocusHandlers() {
    if (!this.mainWindow) return;

    this.mainWindow.on("focus", () => {
      this.isFocused = true;
    });

    this.mainWindow.on("blur", () => {
      this.isFocused = false;
    });
  }

  private handleIncomingNotification(data: {
    tabId: string;
    title: string;
    body: string;
    tag: string;
    tabTitle?: string;
    favicon?: string;
  }) {
    if (this.checkPermission && !this.checkPermission(data.tabId)) {
      return;
    }

    const notification: WebNotification = {
      id: "",
      tabId: data.tabId,
      tabTitle: data.tabTitle || "Unknown tab",
      favicon: data.favicon || "",
      title: data.title,
      body: data.body,
      timestamp: Date.now(),
      read: false,
    };

    this.store.getState().addNotification(notification);
    this.store.getState().prune(this.retentionDays);

    this.mainWindow?.webContents.send("NOTIFICATION_POPUP", notification);

    if (this.isFocused) {
      const allNotifications = this.store.getState().notifications;
      const latest = allNotifications[0];
      if (latest) {
        this.viewService.showToast(latest);
      }
    } else {
      this.showOsNotification(data);
    }
  }

  private showOsNotification(data: { tabId: string; title: string; body: string; tabTitle?: string }) {
    const osNotification = new Notification({
      title: data.title,
      body: data.body || data.tabTitle || "",
    });

    osNotification.on("click", () => {
      if (data.tabId) {
        this.handleOpenTabById(data.tabId);
      }
      this.mainWindow?.show();
      this.mainWindow?.focus();
    });

    osNotification.show();
  }

  ensureOnTop() {
    this.viewService.ensureOnTop();
  }

  toggleList() {
    this.viewService.toggle();
  }

  private handleOpenTabById(tabId: string) {
    if (!tabId) return;
    this.mainWindow?.webContents.send("OPEN_TAB_BY_ID", { id: tabId });
  }

  private syncStateToRenderer() {
    const state = this.store.getState();
    this.mainWindow?.webContents.send("NOTIFICATION_STATE_SYNC", {
      notifications: state.notifications,
      unreadCount: state.unreadCount,
    });
  }
}
