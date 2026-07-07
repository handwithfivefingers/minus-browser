import { register } from "~/features/sub-window/registry";
import SiteInfoOverlay from "./siteInfo/App";

register({
  path: "/site-info",
  name: "Site Information",
  component: SiteInfoOverlay,
  shell: false,
});
