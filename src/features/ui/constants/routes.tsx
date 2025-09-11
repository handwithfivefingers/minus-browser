import { lazy, Suspense } from "react";
// const LayoutV2 = lazy(() => import("~/features/ui/pages/layout.v2"));
const Layout = lazy(() => import("~/features/ui/pages/layout"));
const CustomApp = lazy(() => import("~/features/ui/pages/customApp"));
const Home = lazy(() => import("~/features/ui/pages/home"));
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
