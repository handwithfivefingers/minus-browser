import { useEffect, useRef } from 'react'

import { useNotificationStore } from '../stores/useNotificationStore'
import { useUpdateStore } from '../stores/useUpdateStore'

export const UpdateBanner = () => {
  const { status, quitAndInstall } = useUpdateStore()
  const { notify } = useNotificationStore()
  const prevStatus = useRef(status.status)

  useEffect(() => {
    if (status.status === 'downloaded' && prevStatus.current !== 'downloaded') {
      notify({
        type: 'success',
        title: 'Update ready',
        message: 'Restart to apply the latest update',
        duration: 0,
        action: {
          label: 'Restart',
          onClick: quitAndInstall,
        },
      })
    }
    prevStatus.current = status.status
  }, [status.status, notify, quitAndInstall])

  return null
}
