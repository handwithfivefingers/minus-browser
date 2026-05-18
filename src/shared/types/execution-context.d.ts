export interface IWebContentsLike {
  executeJavaScript(code: string, userGesture?: boolean): Promise<any>;
  loadURL(url: string): Promise<void>;
  getURL(): string;
  getTitle(): string;
  reload(): void;
  findInPage(text: string, options?: Electron.FindInPageOptions): number;
  stopFindInPage(action: "clearSelection" | "keepSelection" | "activateSelection"): void;
  isDevToolsOpened(): boolean;
  openDevTools(): void;
  closeDevTools(): void;
  on(event: string, listener: (...args: any[]) => void): this;
  once(event: string, listener: (...args: any[]) => void): this;
  off(event: string, listener: (...args: any[]) => void): this;
  send(channel: string, ...args: any[]): void;
  session: Electron.Session;
}

export interface IBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IExecutionContext {
  tabId: string;
  url: string;
  webContents: IWebContentsLike;
  getBounds(): IBounds;
}

export interface IOverlayContext extends IExecutionContext {
  addChildView(view: unknown): void;
  removeChildView(view: unknown): void;
}
