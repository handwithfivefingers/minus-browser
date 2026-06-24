import { IconDownload, IconRefresh, IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useUpdateStore } from "../stores/useUpdateStore";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  checking: { label: "Checking for updates...", color: "bg-blue-500" },
  available: { label: "Update available — downloading...", color: "bg-amber-500" },
  "not-available": { label: "You're up to date", color: "bg-green-500" },
  downloaded: { label: "Update ready — restart to apply", color: "bg-green-600" },
  error: { label: "Update check failed", color: "bg-red-500" },
};

export const UpdateBanner = () => {
  const { status, checkForUpdate, quitAndInstall } = useUpdateStore();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
  }, [status.status]);

  if (status.status === "idle" || status.status === "checking" || dismissed) return null;

  const info = STATUS_LABELS[status.status];
  if (!info) return null;

  return (
    <div className={`flex items-center justify-between px-4 py-1.5 text-white text-xs ${info.color}`}>
      <div className="flex items-center gap-2">
        {(status.status === "available" || status.status === "downloading") && (
          <IconDownload size={14} className="animate-pulse" />
        )}
        {status.status === "downloaded" && <IconRefresh size={14} />}
        <span>{info.label}</span>
        {status.status === "downloading" && status.info && (
          <span className="opacity-80">{Math.round((status.info as any).percent)}%</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {status.status === "error" && (
          <button type="button" onClick={checkForUpdate} className="underline hover:no-underline cursor-pointer">
            Retry
          </button>
        )}
        {status.status === "downloaded" && (
          <button
            type="button"
            onClick={quitAndInstall}
            className="bg-white text-green-700 px-3 py-0.5 rounded font-medium hover:bg-green-50 cursor-pointer"
          >
            Restart
          </button>
        )}
        {status.status !== "downloaded" && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="opacity-70 hover:opacity-100 cursor-pointer"
          >
            <IconX size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
