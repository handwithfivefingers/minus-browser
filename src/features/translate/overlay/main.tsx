import React from "react";
import { createRoot } from "react-dom/client";
// @ts-ignore
import "./assets/styles.css";
import App from "./App";

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(<App />);
