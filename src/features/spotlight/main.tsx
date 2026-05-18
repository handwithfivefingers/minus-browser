import { createRoot } from "react-dom/client";
// @ts-ignore
import "./assets/styles.css";
import clsx from "clsx";
import { IconGripVertical } from "@tabler/icons-react";

const App = () => {
  return (
    <div className="w-full bg-slate-900/20 h-full border-slate-500 border rounded-sm p-4">
      <div>
        <button
          className={clsx("w-4 h-4 text-black")}
          style={
            {
              WebkitAppRegion: "drag",
            } as Record<string, string>
          }
        >
          <IconGripVertical size={14} />
        </button>
      </div>
      Spotlight
    </div>
  );
};

const root = createRoot(document.getElementById("root") as HTMLElement);

root.render(<App />);
