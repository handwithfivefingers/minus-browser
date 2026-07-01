import { register } from "~/features/sub-window/registry";
import CapturePage from "./overlay/App";

register({
  path: "/capture",
  name: "Capture",
  component: CapturePage,
  shell: true,
});
