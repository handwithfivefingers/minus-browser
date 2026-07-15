import { register } from "~/renderer/sub-window/registry";
import VaultPage from "./overlay/App";

register({
  path: "/vault",
  name: "Vault",
  component: VaultPage,
  shell: true,
});
