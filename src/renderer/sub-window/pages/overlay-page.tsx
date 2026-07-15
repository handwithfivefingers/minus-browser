import { useCallback } from "react";
import { Shell } from "../Shell";
import { SUB_WINDOW_RENDERER_EVENT } from "~/shared/constants/ipc/sub-window";
import type { OverlayRegister } from "../registry";

interface OverlayPageProps {
  register: OverlayRegister;
}

export default function OverlayPage({ register }: OverlayPageProps) {
  const Comp = register.component;

  const close = useCallback(() => {
    window.api.EMIT(SUB_WINDOW_RENDERER_EVENT.CLOSE);
  }, []);

  if (register.shell === false) {
    return <Comp />;
  }

  return (
    <Shell title={register.name} onClose={close}>
      <Comp />
    </Shell>
  );
}
