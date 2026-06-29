import { IconBrain, IconBrandWechat, IconCamera, IconFileText, IconLanguage, IconPencil, IconQuestionMark, IconX } from "@tabler/icons-react";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { AiSidebarMode, useAiSidebarStore } from "../stores/useAiSidebarStore";
import { ChatMode, SummaryMode, GenerateMode, ExplainMode, CaptureMode } from "../modes";
import { LANGUAGE_MAP } from "../services/promptTemplates";
import { useAiSettingsStore } from "../stores/useAiSettingsStore";
/** @ts-ignore */
import styles from "./styles.module.css";

const MODE_TABS: { key: AiSidebarMode; label: string; icon: React.ReactNode }[] = [
  { key: "chat", label: "Chat", icon: <IconBrandWechat size={16} /> },
  { key: "summarize", label: "Summarize", icon: <IconFileText size={16} /> },
  { key: "generate", label: "Generate", icon: <IconPencil size={16} /> },
  { key: "explain", label: "Explain", icon: <IconQuestionMark size={16} /> },
  { key: "capture", label: "Capture", icon: <IconCamera size={16} /> },
];

const LANGUAGE_OPTIONS = Object.entries(LANGUAGE_MAP).map(([value, label]) => ({ value, label }));

const AiSidebar = () => {
  const { isOpen, activeMode, width, close, setMode, setWidth } = useAiSidebarStore();
  const { language, setLanguage } = useAiSettingsStore();
  const [isDragging, setIsDragging] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleResize = (e: MouseEvent) => {
      if (!isDragging) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 300 && newWidth <= 600) {
        setWidth(newWidth);
      }
    };

    const stopResize = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleResize);
      document.addEventListener("mouseup", stopResize);
    }

    return () => {
      document.removeEventListener("mousemove", handleResize);
      document.removeEventListener("mouseup", stopResize);
    };
  }, [isDragging, setWidth]);

  return (
    <div
      ref={sidebarRef}
      className={clsx(
        "flex-shrink-0 flex flex-col bg-white transition-all duration-200 overflow-hidden h-full",
        styles.sidebar,
        {
          "w-0 opacity-0": !isOpen,
          "border-l": isOpen,
        },
      )}
      style={{
        width: isOpen ? `${width}px` : "0px",
        minWidth: isOpen ? "300px" : "0px",
      }}
    >
      {/* Resize handle (left edge) */}
      <div
        className="hover:bg-indigo-400 transition-colors"
        onMouseDown={startResize}
        style={{
          position: "absolute",
          left: "0",
          top: "0",
          bottom: "0",
          width: "3px",
          cursor: "col-resize",
          zIndex: 10,
          backgroundColor: isDragging ? "#818cf8" : "transparent",
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 shrink-0">
        <div className="flex gap-2 items-center text-sm font-semibold text-indigo-500">
          <IconBrain size={16} />
          <span>AI Sidebar</span>
        </div>
        <button
          onClick={close}
          className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
          title="Close AI sidebar"
        >
          <IconX size={16} />
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex border-b border-slate-200 shrink-0">
        {MODE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMode(tab.key)}
            className={clsx(
              "flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium cursor-pointer transition-colors",
              {
                "text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/50": activeMode === tab.key,
                "text-slate-500 hover:text-slate-700 hover:bg-slate-50": activeMode !== tab.key,
              },
            )}
            title={tab.label}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Language selector */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-1.5">
          <IconLanguage size={12} className="text-slate-400" />
          <span className="text-[10px] text-slate-500">Language</span>
        </div>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="text-[10px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-slate-600 outline-none focus:border-indigo-300"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {activeMode === "chat" && <ChatMode />}
        {activeMode === "summarize" && <SummaryMode />}
        {activeMode === "generate" && <GenerateMode />}
        {activeMode === "explain" && <ExplainMode />}
        {activeMode === "capture" && <CaptureMode />}
      </div>
    </div>
  );
};

export { AiSidebar };
