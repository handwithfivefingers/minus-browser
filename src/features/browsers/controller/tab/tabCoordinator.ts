import { Tab } from "../../classes/tab";
import { ITab } from "../../interfaces";
import { TabController } from "./tabController";
import { WebContentsViewController } from "./webContentsViewController";
import { AdBlocker } from "../adsBlock";
import { BrowserWindow } from "electron";
export class TabCoordinator {
  adBlocker: AdBlocker;
  private viewControllers: Map<string, WebContentsViewController> = new Map();
  private tabController: TabController;
  constructor() {
    this.tabController = new TabController();
    this.adBlocker = new AdBlocker();
  }
  async initalize() {
    await this.tabController.initialize();
  }

  get getTabs() {
    return this.tabController.tabs?.size ? [...this.tabController.tabs.values()] : [];
  }

  get getIndex() {
    return this.tabController.index;
  }

  getActiveTab(id: string) {
    try {
      const tab = this.tabController.getTabById(id);
      if (!tab) return null;
      const isViewExist = this.viewControllers.has(id);
      let view;
      if (!isViewExist) {
        view = new WebContentsViewController({ tabId: id, blocker: this.adBlocker });
        this.viewControllers.set(id, view);
        this.onFaviconChanged({ tab, webContentsView: view });
      } else {
        view = this.viewControllers.get(id);
      }
      return { tab, webContentsView: view };
    } catch (error) {
      return null;
    }
  }

  createTab(tab?: Partial<ITab>) {
    const newTab = new Tab(tab);
    this.tabController.addNewTab(newTab);
    return newTab;
  }

  showView({ id, window }: { id: string; window: BrowserWindow }) {
    const { view } = this.viewControllers.get(id);
    if (view) {
      view.setVisible(true);
      window.contentView.addChildView(view);
    }
  }

  bookmark({ url, id }: Partial<Tab>) {
    this.tabController.addNewBookmark({ url, id });
  }

  hideView({ id, window }: { id: string; window: BrowserWindow }) {
    const wcView = this.viewControllers.get(id);
    if (wcView?.view) {
      wcView.view?.setVisible(false);
      window.contentView.removeChildView(wcView.view);
    }
  }

  clearCache({ id }: { id: string }) {
    const wcView = this.viewControllers.get(id);
    if (wcView?.webContents) {
      wcView.webContents?.session.clearCache();
    }
  }

  clearAllCache() {
    this.viewControllers.forEach((view) => {
      view.webContents?.session.clearCache();
    });
  }

  closeTab({ id, window }: { id: string; window: BrowserWindow }) {
    this.tabController.closeTab(id);
    const { view, webContents } = this.viewControllers.get(id);
    if (view) {
      webContents?.close();
      window.contentView.removeChildView(view);
    }
    this.viewControllers.delete(id);
    return view;
  }

  onFaviconChanged({ tab, webContentsView }: { tab: Tab; webContentsView: WebContentsViewController }) {
    webContentsView.webContents.on("page-favicon-updated", (event, favicons) => {
      tab.favicon = favicons[0];
      tab.updateTitle(webContentsView.webContents.getTitle());
      tab.updateUrl(webContentsView.webContents.getURL());
    });
  }
}
