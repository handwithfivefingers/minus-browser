// const router = createBrowserRouter([
//   {
//     path: "/",
//     element: <div>Hello World</div>,
//   },
// ]);
import CustomApp from "~/pages/customApp";
import Home from "~/pages/home";
import Layout from "~/pages/layout";
const APP_ROUTES = [
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      // {
      //   path: "flo",
      //   element: <Flo />,
      // },
      // {
      //   path: "add",
      //   element: <AddCustomApp />,
      // },
      // {
      //   path: "web",
      //   element: <WebBrowser />,
      // },
      {
        path: ":customApp",
        element: <CustomApp />,
      },
    ],
  },
];

export { APP_ROUTES };
