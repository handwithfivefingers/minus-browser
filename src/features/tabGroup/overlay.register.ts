import { register } from "~/renderer/sub-window/registry";
import { App as TabGroupPage } from "./overlay/App";

register({
  path: "/tabgroup",
  name: "Tab Group",
  component: TabGroupPage,
  shell: false,
});
