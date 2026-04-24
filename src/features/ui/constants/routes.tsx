import { lazy, Suspense } from "react";
import Layout from "~/features/ui/pages/layout";
// const LayoutV2 = lazy(() => import("~/features/ui/pages/layout.v2"));
// const Layout = lazy(() => import("~/features/ui/pages/layout"));
const CustomApp = lazy(() => import("~/features/ui/pages/customApp"));
const Home = lazy(() => import("~/features/ui/pages/home"));
const Setting = lazy(() => import("~/features/ui/pages/setting"));
const APP_ROUTES = [
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={"Loading..."}>
            <Home />
          </Suspense>
        ),
      },
      {
        path: "setting",
        element: (
          <Suspense fallback={"Loading..."}>
            <Setting />
          </Suspense>
        ),
      },
      {
        path: ":customApp",
        element: (
          <Suspense fallback={"Loading..."}>
            <CustomApp />
          </Suspense>
        ),
      },
    ],
  },
];

export { APP_ROUTES };
