import { UserScript } from '../models/userScript'

export type UserScriptRunAt = 'document-start' | 'document-end' | 'document-idle'

export type UserScriptGrant =
  | 'none'
  | 'unsafeWindow'
  | 'GM_info'
  | 'GM_getValue'
  | 'GM_setValue'
  | 'GM_deleteValue'
  | 'GM_listValues'
  | 'GM_getResourceText'
  | 'GM_getResourceURL'
  | 'GM_addStyle'
  | 'GM_addElement'
  | 'GM_download'
  | 'GM_getTab'
  | 'GM_saveTab'
  | 'GM_getTabs'
  | 'GM_log'
  | 'GM_notification'
  | 'GM_openInTab'
  | 'GM_setClipboard'
  | 'GM_xmlhttpRequest'
  | 'GM_registerMenuCommand'
  | 'GM_unregisterMenuCommand'
  | 'window.close'
  | 'window.focus'

export interface IUserScriptResource {
  name: string
  url: string
  content?: string
  contentType?: string
}

export interface IUserScriptRequire {
  url: string
  content?: string
}

export interface IUserScriptMetadata {
  name: string
  namespace?: string
  version?: string
  description?: string
  author?: string
  matches: string[]
  excludes: string[]
  includes: string[]
  requires: IUserScriptRequire[]
  resources: IUserScriptResource[]
  grants: UserScriptGrant[]
  runAt: UserScriptRunAt
  noframes: boolean
  icon?: string
  downloadURL?: string
  updateURL?: string
  supportURL?: string
  homepageURL?: string
  license?: string
  connect: string[]
}

export interface IUserScript {
  id: string
  name: string
  source: string
  matches: string[]
  excludes?: string[]
  includes?: string[]
  namespace?: string
  version?: string
  description?: string
  author?: string
  requires?: IUserScriptRequire[]
  resources?: IUserScriptResource[]
  grants?: UserScriptGrant[]
  runAt: UserScriptRunAt
  noframes?: boolean
  icon?: string
  downloadURL?: string
  updateURL?: string
  supportURL?: string
  homepageURL?: string
  license?: string
  connect?: string[]
  enabled: boolean
  builtIn?: boolean
  createdAt?: number
  updatedAt?: number
}

export interface IUserScriptStore {
  scripts: UserScript[]
}

export type GMXMLHttpRequestMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS'

export interface GMXMLHttpRequestOptions {
  url: string
  method?: GMXMLHttpRequestMethod
  headers?: Record<string, string>
  data?: string | FormData | Blob | Record<string, any>
  cookie?: string
  binary?: boolean
  nocache?: boolean
  revalidate?: boolean
  timeout?: number
  responseType?: 'text' | 'json' | 'blob' | 'arraybuffer' | 'document' | 'stream'
  overrideMimeType?: string
  anonymous?: boolean
  user?: string
  password?: string
  onload?: (response: GMXMLHttpRequestResponse) => void
  onerror?: (response: GMXMLHttpRequestResponse) => void
  onprogress?: (response: GMXMLHttpRequestProgressResponse) => void
  onreadystatechange?: (response: GMXMLHttpRequestResponse) => void
  ontimeout?: () => void
  onabort?: () => void
}

export interface GMXMLHttpRequestResponse {
  finalUrl: string
  readyState: number
  status: number
  statusText: string
  responseHeaders: string
  response: any
  responseText: string
  responseXML: Document | null
}

export interface GMXMLHttpRequestProgressResponse extends GMXMLHttpRequestResponse {
  lengthComputable: boolean
  loaded: number
  total: number
}

export interface GMNotificationDetails {
  text: string
  title?: string
  image?: string
  highlight?: boolean
  silent?: boolean
  timeout?: number
  onclick?: () => void
  ondone?: () => void
}

export interface GMOpenInTabOptions {
  active?: boolean
  insert?: boolean
  setParent?: boolean
  incognito?: boolean
}

export interface GMDownloadOptions {
  url: string
  name?: string
  headers?: Record<string, string>
  saveAs?: boolean
  conflictAction?: 'uniquify' | 'overwrite' | 'prompt'
  onload?: () => void
  onerror?: (error: Error) => void
  onprogress?: (progress: { loaded: number; total: number }) => void
  ontimeout?: () => void
}

export interface GMInfoScript {
  id: string
  name: string
  namespace: string | null
  version: string | null
  description: string | null
  author: string | null
  matches: string[]
  excludes: string[]
  includes: string[]
  resources: IUserScriptResource[]
  grants: string[]
  runAt: string
  noframes: boolean | null
  icon: string | null
  downloadURL: string | null
  updateURL: string | null
  supportURL: string | null
  homepageURL: string | null
  license: string | null
  installURL: string | null
}

export interface GMInfo {
  script: GMInfoScript
  scriptMetaStr: string | null
  scriptWillUpdate: boolean
  version: string
  platform: {
    arch: string
    browserName: string
    browserVersion: string
    os: string
    platform: string
    userAgent: string
  }
}

export interface GMRequest {
  requestId: string
  scriptId: string
  method: string
  args: any[]
}

export interface GMResponse {
  requestId: string
  success: boolean
  data?: any
  error?: string
}

export interface GMProgressEvent {
  requestId: string
  type: 'progress' | 'readystatechange' | 'final'
  data: any
}

export interface ScriptInjectionPayload {
  id: string
  name: string
  source: string
  metadata: IUserScriptMetadata
  grants: UserScriptGrant[]
  runAt: UserScriptRunAt
}
