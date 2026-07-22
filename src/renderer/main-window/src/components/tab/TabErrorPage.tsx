import {
  IconAlertTriangle,
  IconCloudOff,
  IconClock,
  IconHome,
  IconLock,
  IconQuestionMark,
  IconRefresh,
  IconWifiOff,
} from '@tabler/icons-react'

interface TabErrorPageProps {
  error: {
    code: string
    description: string
    url: string
    httpResponseCode?: number
    isCertError?: boolean
  }
  onRetry?: () => void
  onGoHome?: () => void
}

const getErrorTitle = (code: string): string => {
  if (code.startsWith('ERR_NAME_NOT_RESOLVED')) return "This site can't be reached"
  if (code.startsWith('ERR_CONNECTION_REFUSED')) return "This site can't be reached"
  if (code.startsWith('ERR_CONNECTION_TIMED_OUT')) return "This site can't be reached"
  if (code.startsWith('ERR_CONNECTION_RESET')) return "This site can't be reached"
  if (code.startsWith('ERR_INTERNET_DISCONNECTED')) return 'No internet'
  if (code.startsWith('ERR_TIMED_OUT')) return 'This site took too long to respond'
  if (code.startsWith('ERR_CERT')) return 'Your connection is not private'
  if (code.startsWith('HTTP_4') || code.startsWith('HTTP_5')) return "This page isn't working"
  return 'Navigation error'
}

const ErrorIcon = ({ code }: { code: string }) => {
  if (code.startsWith('ERR_INTERNET_DISCONNECTED'))
    return <IconWifiOff className="text-slate-400" size={64} stroke={1.5} />
  if (code.startsWith('ERR_TIMED_OUT')) return <IconClock className="text-slate-400" size={64} stroke={1.5} />
  if (code.startsWith('ERR_CERT')) return <IconLock className="text-slate-400" size={64} stroke={1.5} />
  if (code.startsWith('HTTP_4') || code.startsWith('HTTP_5'))
    return <IconAlertTriangle className="text-slate-400" size={64} stroke={1.5} />
  if (code.startsWith('ERR_NAME_NOT_RESOLVED') || code.startsWith('ERR_CONNECTION'))
    return <IconCloudOff className="text-slate-400" size={64} stroke={1.5} />
  return <IconQuestionMark className="text-slate-400" size={64} stroke={1.5} />
}

const TabErrorPage = ({ error, onRetry, onGoHome }: TabErrorPageProps) => {
  const title = getErrorTitle(error.code)

  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-50">
      <div className="max-w-md px-6 text-center">
        <div className="mb-4 flex justify-center">
          <ErrorIcon code={error.code} />
        </div>
        <h1 className="mb-2 text-xl font-semibold text-slate-800">{title}</h1>
        {error.httpResponseCode && (
          <span className="mb-3 inline-block rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
            {error.httpResponseCode}
          </span>
        )}
        <p className="mb-2 text-sm leading-relaxed text-slate-500">{error.description}</p>
        <p className="mb-6 text-xs break-all text-slate-400">{error.url}</p>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
          >
            <IconRefresh size={16} />
            Retry
          </button>
          <button
            type="button"
            onClick={onGoHome}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500 bg-transparent px-5 py-2 text-sm font-medium text-indigo-500 transition-colors hover:bg-indigo-50"
          >
            <IconHome size={16} />
            Go to Home
          </button>
        </div>
      </div>
    </div>
  )
}

export { TabErrorPage }
