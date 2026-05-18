import { IconDeviceFloppy, IconPuzzle } from "@tabler/icons-react";
import { Switch } from "~/features/ui/components";
import { useMinusThemeStore } from "~/features/ui/stores/useMinusTheme";

export const Extension = () => {
  const { extension, setExtension, saved } = useMinusThemeStore();
  const { adblock, translate, vault, userscript } = extension;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <IconPuzzle size={18} className="text-slate-700" />
        <h2 className="text-lg font-semibold text-slate-900">Extension Management</h2>
      </div>
      <div className="w-60 bg-slate-100 rounded flex flex-col gap-2 p-2 border border-slate-200">
        <div className="flex gap-2 items-center">
          <label className="text-slate-600 w-40 ">Adblock</label>
          <Switch title="Adblock" value={adblock} onCheck={(v) => setExtension({ ...extension, adblock: v })} />
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-slate-600 w-40 ">Translate</label>
          <Switch title="Translate" value={translate} onCheck={(v) => setExtension({ ...extension, translate: v })} />
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-slate-600 w-40 ">Vault</label>
          <Switch title="Vault" value={vault} onCheck={(v) => setExtension({ ...extension, vault: v })} />
        </div>
        <div className="flex gap-2 items-center w-full">
          <label className="text-slate-600 w-40 ">UserScript</label>
          <Switch
            title="UserScript"
            className=""
            value={userscript}
            onCheck={(v) => setExtension({ ...extension, userscript: v })}
          />
        </div>
      </div>
      <div className="pt-5">
        <button
          type="button"
          onClick={saved}
          className="h-10 px-4 rounded-lg bg-slate-900 text-white text-sm inline-flex items-center gap-2 hover:bg-slate-700 cursor-pointer"
        >
          <IconDeviceFloppy size={16} />
          Save
        </button>
      </div>
    </div>
  );
};
