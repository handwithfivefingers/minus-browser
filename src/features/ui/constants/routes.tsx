import CustomApp from "~/features/ui/pages/customApp";
import Home from "~/features/ui/pages/home";
import Layout from "~/features/ui/pages/layout";
const APP_ROUTES = [
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: ":customApp",
        element: <CustomApp />,
      },
    ],
  },
];

export { APP_ROUTES };
