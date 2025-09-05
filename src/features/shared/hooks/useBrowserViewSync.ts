import { useEffect, RefObject } from "react";

const { ipcRenderer } = window.require("electron");

interface IUseBrowserView {
  url: string;
  containerRef: RefObject<HTMLDivElement>;
}
const useBrowserViewSync = ({ url, containerRef }: IUseBrowserView) => {
  // const onResize = (ref: React.RefObject<HTMLDivElement>) => {
  //   if (!ref.current) return;
  //   const updateSize = () => {
  //     const { x, y, width, height } = ref.current.getBoundingClientRect();
  //     ipcRenderer.send("update-browserview-size", { x, y, width, height });
  //   };
  //   const { x, y, width, height } = ref.current.getBoundingClientRect();
  //   ipcRenderer.send("update-browserview-size", { x, y, width, height });
  // };

  const onShow = () => {
    if (!containerRef.current) return;
    const { x, y, width, height } = containerRef.current.getBoundingClientRect();
    ipcRenderer.send("show-sample-view", { url, x, y, width, height });
  };

  useEffect(() => {
    if (!url || !containerRef.current) return;
    const updateSize = () => {
      const { x, y, width, height } = containerRef.current.getBoundingClientRect();
      ipcRenderer.send("update-browserview-size", { x, y, width, height });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => {
      window.removeEventListener("resize", updateSize);
      ipcRenderer.send("hide-sample-view", { url });
    };
  }, [url]);
  return { onShow };
};

export { useBrowserViewSync };
