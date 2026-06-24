import { createRoot } from "react-dom/client";
import SpotlightApp from "./App";
// @ts-ignore
import "./assets/styles.css";

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(<SpotlightApp />);
