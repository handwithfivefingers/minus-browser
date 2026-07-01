import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

const DRAG_HANDLE_HEIGHT = 32;
const DRAG_PREFIX = "__MINUS_YOUTUBE_EMBED_DRAG__:";
const MINIMIZE_PREFIX = "__MINUS_YOUTUBE_EMBED_MINIMIZE__:";
const ZOOM_PREFIX = "__MINUS_YOUTUBE_EMBED_ZOOM__:";
const CLOSE_PREFIX = "__MINUS_YOUTUBE_EMBED_CLOSE__:";

const btnStyle: React.CSSProperties = {
  width: 14,
  height: 14,
  borderRadius: "50%",
  border: "none",
  padding: 0,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 10,
  lineHeight: 1,
  color: "rgba(0,0,0,0)",
};

const App = () => {
  const [videoId, setVideoId] = useState<string | null>(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      setVideoId(hash);
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMinimize = useCallback(() => {
    console.log(MINIMIZE_PREFIX);
  }, []);

  const handleZoom = useCallback(() => {
    console.log(ZOOM_PREFIX);
  }, []);

  const handleClose = useCallback(() => {
    console.log(CLOSE_PREFIX);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      console.log(DRAG_PREFIX + JSON.stringify({ dx, dy }));
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  if (!videoId) {
    return (
      <div
        style={{
          width: "calc(100vw - 32px)",
          height: "calc(100svh - 32px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.6)",
          color: "#fff",
          fontSize: 14,
          fontFamily: "sans-serif",
        }}
      >
        Waiting for video...
      </div>
    );
  }

  return (
    <div
      style={{ width: "calc(100vw - 32px)", height: "calc(100svh - 32px)", display: "flex", flexDirection: "column" }}
    >
      <div
        style={{
          height: DRAG_HANDLE_HEIGHT,
          background: "rgba(30,30,30,0.8)",
          display: "flex",
          alignItems: "center",
          padding: "0 8px",
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          userSelect: "none",
          gap: 6,
        }}
      >
        <button
          type="button"
          onClick={handleClose}
          style={{ ...btnStyle, background: "#ff5f57" }}
          title="Close"
        />
        <button
          type="button"
          onClick={handleMinimize}
          style={{ ...btnStyle, background: "#febc2e" }}
          title="Minimize"
        />
        <button
          type="button"
          onClick={handleZoom}
          style={{ ...btnStyle, background: "#28c840" }}
          title="Zoom"
        />
        <button
          type="button"
          onMouseDown={handleMouseDown}
          style={{
            flex: 1,
            height: "100%",
            cursor: "grab",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "none",
            border: "none",
            padding: 0,
          }}
        >
          <div
            style={{
              width: 32,
              height: 4,
              borderRadius: 2,
              background: "rgba(255,255,255,0.4)",
            }}
          />
        </button>
      </div>
      <iframe
        width="100%"
        height="100%"
        style={{ display: "block", border: 0 }}
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&enablejsapi=1&rel=0&modestbranding=1`}
        title="YouTube video player"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(<App />);
