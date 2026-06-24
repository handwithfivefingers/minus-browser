import { register } from "~/features/sub-window/registry";
import VaultPage from "./overlay/App";

register({
  path: "/vault",
  name: "Vault",
  component: VaultPage,
  shell: true,
});
