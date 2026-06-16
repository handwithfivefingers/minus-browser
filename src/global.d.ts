declare module "electron-findbar" {
  export interface Bounce {
    x: number;
    y: number;
    width: number;
    height: number;
  }
  export type BoundsHandlerCallback = (parentBounds: Bounce, findbarBounds: Bounce) => Partial<Rectangle>;

  export type FindBar = {
    open(): void;
    close(): void;
    setBoundsHandler(handler: BoundsHandlerCallback): void;
  };
  export function from(BrowserWindow: Electron.BrowserWindow | WebContents): FindBar;
  export function fromIfExists(BrowserWindow: Electron.BrowserWindow | WebContents): FindBar;
}
