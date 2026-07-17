import React from "react";
import { IPC_INVOKE_CHANNEL } from "~/shared/constants/ipc";
import { SUB_WINDOW_RENDERER_EVENT } from "~/shared/constants/ipc/sub-window";
import { useForm, FormProvider, FieldErrors } from "react-hook-form";
import { preferenceSchema, PreferenceSchemaType } from "./schema/preference";
import FormControl from "~/renderer/sub-window/components/formControl";
import Input from "~/renderer/sub-window/components/input";
import { Switch } from "~/renderer/main-window/src/components";
import TextArea from "~/renderer/sub-window/components/textarea";
const defaultPreference: PreferenceSchemaType = {
  sourceLanguage: "auto",
  targetLanguage: "en",
  autoTranslate: true,
  alwaysTranslateDomains: "",
  neverTranslateDomains: "",
  neverTranslateLanguages: "",
};

const splitLines = (value: string) =>
  (value &&
    value
      .split("\n")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)) ||
  "";

const App = () => {
  const form = useForm<PreferenceSchemaType>({ defaultValues: defaultPreference, resolver: preferenceSchema });
  const [openState, setOpenState] = React.useState(false);

  React.useEffect(() => {
    const raw = sessionStorage.getItem("subWindowPayload");
    sessionStorage.removeItem("subWindowPayload");
    if (raw) {
      try {
        const data = JSON.parse(raw);
        const nextPreference = { ...defaultPreference, ...(data.preference || {}) };
        form.setValue("sourceLanguage", nextPreference.sourceLanguage);
        form.setValue("targetLanguage", nextPreference.targetLanguage);
        form.setValue("autoTranslate", nextPreference.autoTranslate);
        form.setValue("alwaysTranslateDomains", nextPreference.alwaysTranslateDomains.join("\n"));
        form.setValue("neverTranslateDomains", nextPreference.neverTranslateDomains.join("\n"));
        form.setValue("neverTranslateLanguages", nextPreference.neverTranslateLanguages.join("\n"));
        setOpenState(true);
      } catch {
        /* ignore */
      }
    }
  }, []);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && openState) {
        handleCancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openState]);

  if (!openState) return <div style={{ display: "none" }} />;

  const onSubmit = (value: PreferenceSchemaType) => {
    window.api.INVOKE(IPC_INVOKE_CHANNEL.TRANSLATE_SAVE_PREFERENCE, {
      ...value,
      alwaysTranslateDomains: splitLines(value?.alwaysTranslateDomains as string),
      neverTranslateDomains: splitLines(value?.neverTranslateDomains as string),
      neverTranslateLanguages: splitLines(value?.neverTranslateLanguages as string),
    });
    window.api.EMIT(SUB_WINDOW_RENDERER_EVENT.CLOSE);
  };

  const handleCancel = () => {
    window.api.EMIT(SUB_WINDOW_RENDERER_EVENT.CLOSE);
  };

  const onErrors = (errors: FieldErrors<PreferenceSchemaType>) => {
    console.log(errors);
  };
  return (
    <FormProvider {...form}>
      <form className="flex flex-col w-xl rounded-xl" onSubmit={form.handleSubmit(onSubmit, onErrors)}>
        <div className="text-slate-800 dark:text-white font-medium mb-4">Translate Preferences</div>

        <div className="grid grid-cols-2 gap-1">
          <FormControl name="sourceLanguage">
            <Input label="Source language" name="sourceLanguage" placeholder="auto" />
          </FormControl>
          <FormControl name="targetLanguage">
            <Input label="Target language" placeholder="en" />
          </FormControl>

          <FormControl
            name="autoTranslate"
            className="col-span-2"
            render={({ field }) => {
              return <Switch label="Auto Translate" onCheck={field.onChange} value={field.value} />;
            }}
          />
          <FormControl name="alwaysTranslateDomains" className="col-span-2">
            <TextArea label="Always translate domains (one per line)" placeholder="news.example.com" />
          </FormControl>
          <FormControl name="neverTranslateDomains" className="col-span-2">
            <TextArea label="Never translate domains (one per line)" placeholder="news.example.com" />
          </FormControl>
          <FormControl name="neverTranslateLanguages" className="col-span-2">
            <TextArea label="Never translate languages (one per line, ex: ja)" placeholder="en" />
          </FormControl>
        </div>

        <div className="flex justify-end gap-4 shrink-0 p-2 mt-4">
          <button
            type="button"
            onClick={handleCancel}
            className="h-[30px] px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer text-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="h-[30px] px-3 rounded-lg border border-transparent bg-indigo-600 text-white cursor-pointer text-xs hover:bg-indigo-500"
          >
            Save
          </button>
        </div>
      </form>
    </FormProvider>
  );
};

export default App;
