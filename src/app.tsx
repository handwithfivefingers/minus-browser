import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router";
import { APP_ROUTES } from "./constants/routes";
import "./index.css";

const root = createRoot(document.getElementById("root") as HTMLElement);

const router = createHashRouter(APP_ROUTES);
root.render(<RouterProvider router={router} />);
