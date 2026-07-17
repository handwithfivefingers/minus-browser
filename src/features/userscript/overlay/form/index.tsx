import clsx from "clsx";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "~/renderer/main-window/src/components";
import FormControl from "~/renderer/sub-window/components/formControl";
import Input from "~/renderer/sub-window/components/input";
import Select from "~/renderer/sub-window/components/select";
import type { UserScriptSchema } from "../schema/userscript";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
// @ts-ignore
import "prismjs/themes/prism-tomorrow.min.css";

const GRANT_OPTIONS = [
  "unsafeWindow",
  "GM_info",
  "GM_getValue",
  "GM_setValue",
  "GM_deleteValue",
  "GM_listValues",
  "GM_getResourceText",
  "GM_getResourceURL",
  "GM_addStyle",
  "GM_addElement",
  "GM_download",
  "GM_getTab",
  "GM_saveTab",
  "GM_getTabs",
  "GM_log",
  "GM_notification",
  "GM_openInTab",
  "GM_setClipboard",
  "GM_xmlhttpRequest",
  "GM_registerMenuCommand",
  "GM_unregisterMenuCommand",
  "window.close",
  "window.focus",
];

export const UserScriptForm = () => {
  const form = useFormContext<UserScriptSchema>();

  const toggleGrant = (grant: string) => {
    const current = form.getValues("grants") || [];
    const next = current.includes(grant) ? current.filter((g: string) => g !== grant) : [...current, grant];
    form.setValue("grants", next);
  };

  return (
    <div
      className="flex flex-col gap-1 flex-1 overflow-auto "
      style={{ scrollbarGutter: "stable", scrollbarWidth: "thin", scrollbarColor: "#6969dd transparent" }}
    >
      <FormControl name="name">
        <Input label="Script name" />
      </FormControl>
      <FormControl name="namespace">
        <Input label="Namespace" />
      </FormControl>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <FormControl name="version">
          <Input label="Version" />
        </FormControl>
        <FormControl name="author">
          <Input label="Author" />
        </FormControl>
      </div>

      <FormControl name="description">
        <Input label="Description" />
      </FormControl>
      <FormArray label="Matches" />

      <div className="flex justify-between gap-2 items-center">
        <FormControl name="runAt" className="w-full">
          <Select
            label="Run At"
            options={[
              { label: "Document Start", value: "document-start" },
              { label: "Document Idle", value: "document-idle" },
              { label: "Document End", value: "document-end" },
            ]}
          />
        </FormControl>

        <FormControl
          name="enabled"
          render={({ field }) => {
            return (
              <div
                className="relative inline-flex items-center cursor-pointer mt-5"
                onClick={() => {
                  field.onChange(!field.value);
                }}
                role="switch"
                aria-checked={field.value}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') field.onChange(!field.value); }}
              >
                <input type="checkbox" className="sr-only peer" checked={field.value} readOnly />
                <div
                  className={clsx(
                    "w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-indigo-500 peer-focus:outline-none after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full",
                  )}
                />
              </div>
            ) as React.ReactElement;
          }}
        />
      </div>
      <FormControl
        name="grants"
        render={({ field }) => {
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span className="text-slate-800 dark:text-white text-xs">@grant</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {GRANT_OPTIONS.map((grant) => (
                  <button
                    key={grant}
                    type="button"
                    onClick={() => toggleGrant(grant)}
                    className={clsx(
                      "px-2 py-0.5 rounded text-[10px] border cursor-pointer",
                      (field.value || []).includes(grant)
                        ? "bg-indigo-600 text-white border-indigo-400"
                        : "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white/70 border-slate-300 dark:border-slate-600",
                    )}
                  >
                    {grant}
                  </button>
                ))}
              </div>
            </div>
          );
        }}
      />

      <FormControl
        name="source"
        render={({ field }) => {
          return (
            <Editor
              {...field}
              onValueChange={field.onChange}
              highlight={(code) => {
                if (!code) return "";
                return Prism.highlight(code, Prism.languages.js, "js");
              }}
              padding={10}
              style={{
                fontFamily: "monospace",
              }}
              className="text-slate-800 dark:text-white min-h-40 text-xs bg-white dark:bg-white/5 rounded-md border border-slate-300 dark:border-slate-400 px-2 py-1.5 outline-none ring-2 ring-transparent focus:ring-slate-500 transition-all"
            />
          );
        }}
      />
    </div>
  );
};

const FormArray = ({ label }: { label: string }) => {
  const fieldArray = useFieldArray({
    name: "matches",
  });
  const { append, remove, fields } = fieldArray;

  return (
    <div className="flex flex-col gap-0.5">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="text-slate-800 dark:text-white text-sm">{label}</span>
        <Button
          className="border border-slate-600 bg-[#0f172a] text-white hover:bg-slate-600 transition-colors"
          onClick={() => append("")}
        >
          +
        </Button>
      </div>

      {fields?.map((field, index) => {
        return (
          <div key={field.id} className="flex gap-1">
            <FormControl name={`matches.${index}`} className="w-full">
              <Input />
            </FormControl>
            <Button
              className="border border-slate-600 bg-[#0f172a] text-white hover:bg-slate-600 transition-colors"
              onClick={() => remove(index)}
            >
              <span className="w-2">-</span>
            </Button>
          </div>
        );
      })}
    </div>
  );
};
