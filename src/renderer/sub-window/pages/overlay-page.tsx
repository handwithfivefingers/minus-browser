import { Suspense, useCallback } from 'react'

import { SUB_WINDOW_RENDERER_EVENT } from '~/shared/constants/ipc/sub-window'

import { Shell } from '../Shell'
import type { OverlayRegister } from '../registry'

interface OverlayPageProps {
  register: OverlayRegister
}

export default function OverlayPage({ register }: OverlayPageProps) {
  const Comp = register.component

  const close = useCallback(() => {
    window.api.EMIT(SUB_WINDOW_RENDERER_EVENT.CLOSE)
  }, [])

  if (register.shell === false) {
    return (
      <Suspense fallback={<div className="p-4 text-sm text-white/40">Loading…</div>}>
        <Comp />
      </Suspense>
    )
  }

  return (
    <Shell title={register.name} onClose={close}>
      <Suspense fallback={<div className="p-4 text-sm text-white/40">Loading…</div>}>
        <Comp />
      </Suspense>
    </Shell>
  )
}
