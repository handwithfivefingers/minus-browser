import { WebContentsView, BrowserView } from "electron";

interface IView extends WebContentsView {
  url?: string;
  viewType?: "WebContentsView" | "Page";
}
