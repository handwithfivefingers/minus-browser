import { register } from "~/features/sub-window/registry";
import TranslatePage from "./overlay/App";

register({
  path: "/translate",
  name: "Translate",
  component: TranslatePage,
  shell: true,
});
