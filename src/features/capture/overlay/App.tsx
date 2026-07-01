import { useEffect, useState } from "react";
import { IPC_INVOKE_CHANNEL } from "~/shared/constants/ipc";
import { SUB_WINDOW_RENDERER_EVENT } from "~/shared/constants/ipc/sub-window";

const App = () => {
  const [image, setImage] = useState<string | null>(null);
  const [type, setType] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("subWindowPayload");
    sessionStorage.removeItem("subWindowPayload");
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (data.image) setImage(data.image);
        if (data.type) setType(data.type);
        if (data.copied) setCopied(true);
      } catch {}
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        window.api.EMIT(SUB_WINDOW_RENDERER_EVENT.CLOSE);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleCopy = async () => {
    try {
      await window.api.INVOKE(IPC_INVOKE_CHANNEL.CAPTURE_COPY_CLIPBOARD);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleClose = () => {
    window.api.EMIT(SUB_WINDOW_RENDERER_EVENT.CLOSE);
  };

  if (!image) return null;

  return (
    <div
      className="flex flex-col max-w-4xl w-full h-full max-h-[84vh] overflow-hidden rounded-xl"
      onClick={(event) => event.stopPropagation()}
      style={{ background: "rgba(0,0,0,0.7)" }}
    >
      <div className="max-w-3xl max-h-[70vh] overflow-auto rounded-lg border border-white/10">
        <img src={image} alt="Captured screenshot" className="w-full h-auto" style={{ imageRendering: "auto" }} />
      </div>

      <div className="flex gap-3 p-2">
        <button
          onClick={handleCopy}
          className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium cursor-pointer transition-colors"
        >
          {copied ? "Copied!" : "Copy to clipboard"}
        </button>
        <button
          onClick={handleClose}
          className="px-6 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium cursor-pointer transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default App;
