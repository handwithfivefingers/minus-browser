import { register } from "~/features/sub-window/registry";
import SpotlightPage from "./overlay/App";

register({
  path: "/spotlight",
  name: "Spotlight",
  component: SpotlightPage,
  shell: false,
});
