import { register } from "~/renderer/sub-window/registry";
import UserscriptPage from "./overlay/App";

register({
  path: "/userscript",
  name: "UserScript",
  component: UserscriptPage,
  shell: true,
});
