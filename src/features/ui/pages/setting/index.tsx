import { IconTable, IconTableFilled } from "@tabler/icons-react";
import clsx from "clsx";
import { useEffect, useState } from "react";
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
  const { layout, mode, dataSync } = useMinusThemeStore();

  // useEffect(() => {
  //   window.api.INVOKE("INTERFACE_SAVE", { layout, mode, dataSync });
  // }, []);

  const save = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.api.INVOKE("INTERFACE_SAVE", { layout, mode, dataSync });
  };

  return (
    <div className="relative bg-slate-800 h-full w-full">
      <div className={CLASSES[layout]}>
        <h1 className="font-bold text-xl py-4">Setting</h1>
        <div className="flex gap-2">
          <DataAdjustment />
          <FontAdjustment />
          <Template />
        </div>

        <button className="px-2 py-2 rounded-md bg-indigo-500 text-white my-2" onClick={save}>
          Save Setting
        </button>
      </div>
    </div>
  );
};

const DataAdjustment = () => {
  const [dataAdj, setDataAdj] = useState({
    intervalTime: "15",
  });
  return (
    <div className="bg-slate-200 p-4 rounded-lg flex gap-2 flex-col">
      <span className="font-bold text-lg">Font Adjustment:</span>
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
    </div>
  );
};

const FontAdjustment = () => {
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
};
const Template = () => {
  // const [template, setTemplate] = useState(LayoutTemplate.FLOATING);

  const { setLayout, layout } = useMinusThemeStore();
  return (
    <div className="bg-slate-200 p-4 rounded-lg flex gap-2 flex-col">
      <span className="font-bold text-lg">Layout:</span>
      <div className="flex gap-2 w-full justify-between flex-col gap-2">
        <div
          className={clsx("flex gap-2 border rounded bg-slate-100 border-slate-200 p-2 cursor-pointer", {
            ["!bg-indigo-500 text-white"]: layout === LayoutTemplate.BASIC,
          })}
          onClick={() => setLayout(LayoutTemplate.BASIC)}
        >
          <IconTable />
          <span>{LayoutTemplate.BASIC}</span>
        </div>
        <div
          className={clsx("flex gap-2 border rounded bg-slate-100 border-slate-200 p-2 cursor-pointer", {
            ["!bg-indigo-500 text-white"]: layout === LayoutTemplate.FLOATING,
          })}
          onClick={() => setLayout(LayoutTemplate.FLOATING)}
        >
          <IconTableFilled />
          <span>{LayoutTemplate.FLOATING}</span>
        </div>
      </div>
    </div>
  );
};

export default Setting;
