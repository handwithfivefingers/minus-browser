import { IconTable, IconTableFilled } from "@tabler/icons-react";
import clsx from "clsx";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useMinusThemeStore } from "../../stores/useMinusTheme";
enum LayoutTemplate {
  BASIC = "BASIC",
  FLOATING = "FLOATING",
}

const CLASSES = {
  BASIC: "bg-slate-100 w-full h-full p-8",
  FLOATING: "bg-slate-100 w-full h-full rounded-lg p-8",
};
const Setting = () => {
  const { layout, mode, initialize } = useMinusThemeStore();
  const tempRef = useRef(null);
  const dataAdjRef = useRef(null);
  const save = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const template = tempRef.current.get();
    const dataSync = dataAdjRef.current.get();
    const data = { layout: template, mode, dataSync: { ...dataSync } };
    window.api.INVOKE("INTERFACE_SAVE", data);
    initialize(data);
  };

  return (
    <div className="relative bg-slate-800 h-full w-full">
      <div className={CLASSES[layout]}>
        <h1 className="font-bold text-xl py-4">Setting</h1>
        <div className="flex gap-2">
          <DataAdjustment ref={dataAdjRef} />
          <FontAdjustment />
          <Template ref={tempRef} />
        </div>

        <button
          className="px-2 py-2 rounded-md bg-indigo-500 text-white my-2 active:translate-y-0.5 cursor-pointer"
          onClick={save}
        >
          Save Setting
        </button>
      </div>
    </div>
  );
};

const DataAdjustment = forwardRef<{ get: () => { intervalTime: string } }>((props, ref) => {
  const [dataAdj, setDataAdj] = useState({
    intervalTime: "15",
    hardwareAcceleration: "0",
  });
  useImperativeHandle(ref, () => ({
    get: () => dataAdj,
  }));
  return (
    <div className="bg-slate-200 p-4 rounded-lg flex gap-2 flex-col">
      <span className="font-bold text-lg">System:</span>
      <div className="flex w-full justify-between gap-2">
        <div>Sync data interval:</div>
        <select
          className="bg-slate-300 rounded px-2 w-24"
          value={dataAdj.intervalTime}
          onChange={(e) => setDataAdj((prev) => ({ ...prev, intervalTime: e.target.value }))}
        >
          <option value={"15"}>15 Sec</option>
          <option value={"30"}>30 Sec</option>
          <option value={"45"}>45 Sec</option>
          <option value={"60"}>60 Sec</option>
          <option value={"off"}>Off</option>
        </select>
      </div>
      <div className="flex w-full justify-between gap-2">
        <div>Hardware acceleration:</div>
        <select
          className="bg-slate-300 rounded px-2 w-24"
          value={dataAdj.hardwareAcceleration}
          onChange={(e) => setDataAdj((prev) => ({ ...prev, hardwareAcceleration: e.target.value }))}
        >
          <option value={"0"}>Off</option>
          <option value={"1"}>On</option>
        </select>
      </div>
    </div>
  );
});

const FontAdjustment = forwardRef((props, ref) => {
  const [fontAdj, setFontAdj] = useState({
    fontSize: "10",
  });
  return (
    <div className="bg-slate-200 p-4 rounded-lg flex gap-2 flex-col">
      <span className="font-bold text-lg">Font Adjustment:</span>
      <div className="flex w-full justify-between gap-2">
        <div>Font Size:</div>
        <select
          className="bg-slate-300 rounded px-2 w-24"
          value={fontAdj.fontSize}
          onChange={(e) => setFontAdj((prev) => ({ ...prev, fontSize: e.target.value }))}
        >
          <option value={"8"}>8</option>
          <option value={"12"}>12</option>
          <option value={"16"}>16</option>
          <option value={"20"}>20</option>
        </select>
      </div>
      <div className="flex w-full justify-between gap-2">
        <div>Font Family:</div>
        <select className="bg-slate-300 rounded px-2 w-24">
          <option value={"mono"}>Mono</option>
        </select>
      </div>
    </div>
  );
});
const Template = forwardRef<{ get: () => "BASIC" | "FLOATING" }>((props, ref) => {
  const { layout } = useMinusThemeStore();
  const [layoutTemplate, setLayoutTemplate] = useState<"BASIC" | "FLOATING">(layout);
  useImperativeHandle(ref, () => ({
    get: () => layoutTemplate,
  }));
  return (
    <div className="bg-slate-200 p-4 rounded-lg flex gap-2 flex-col">
      <span className="font-bold text-lg">Layout:</span>
      <div className="flex gap-2 w-full justify-between flex-col">
        <div
          className={clsx("flex gap-2 border rounded bg-slate-100 border-slate-200 p-2 cursor-pointer", {
            ["!bg-indigo-500 text-white"]: layoutTemplate === LayoutTemplate.BASIC,
          })}
          onClick={() => setLayoutTemplate(LayoutTemplate.BASIC)}
        >
          <IconTable />
          <span>{LayoutTemplate.BASIC}</span>
        </div>
        <div
          className={clsx("flex gap-2 border rounded bg-slate-100 border-slate-200 p-2 cursor-pointer", {
            ["!bg-indigo-500 text-white"]: layoutTemplate === LayoutTemplate.FLOATING,
          })}
          onClick={() => setLayoutTemplate(LayoutTemplate.FLOATING)}
        >
          <IconTableFilled />
          <span>{LayoutTemplate.FLOATING}</span>
        </div>
      </div>
    </div>
  );
});

export default Setting;
