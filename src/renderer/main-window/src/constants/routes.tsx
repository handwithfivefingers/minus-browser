import { lazy, Suspense } from "react";
const Layout = lazy(() => import("../pages/layout"));
const CustomApp = lazy(() => import("../pages/customApp"));
const Home = lazy(() => import("../pages/home"));
const Setting = lazy(() => import("../pages/setting"));
const History = lazy(() => import("../pages/history"));
const APP_ROUTES = [
  {
    path: "/",
    element: (
      <Suspense fallback={"Loading..."}>
        <Layout />
      </Suspense>
    ),
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
        path: "history",
        element: (
          <Suspense fallback={"Loading..."}>
            <History />
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
