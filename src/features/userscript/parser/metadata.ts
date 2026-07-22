import {
  IUserScriptMetadata,
  IUserScriptRequire,
  IUserScriptResource,
  UserScriptGrant,
  UserScriptRunAt,
} from '../types'

const METADATA_BLOCK_RE = /\/\/\s*==UserScript==\s*\n([\s\S]*?)\n\s*\/\/\s*==\/UserScript==/im
const DIRECTIVE_RE = /\/\/\s*@([a-zA-Z-]+)\s+(.*?)$/gm

export function parseUserScriptMetadata(source: string): IUserScriptMetadata | null {
  const blockMatch = source.match(METADATA_BLOCK_RE)
  if (!blockMatch) return null

  const block = blockMatch[1]

  const meta: IUserScriptMetadata = {
    name: '',
    matches: [],
    excludes: [],
    includes: [],
    requires: [],
    resources: [],
    grants: [],
    runAt: 'document-start',
    noframes: false,
    connect: [],
  }

  let match: RegExpExecArray | null
  DIRECTIVE_RE.lastIndex = 0
  match = DIRECTIVE_RE.exec(block)
  while (match !== null) {
    const key = match[1].toLowerCase()
    const value = match[2].trim()

    switch (key) {
      case 'name':
        meta.name = value
        break
      case 'namespace':
        meta.namespace = value
        break
      case 'version':
        meta.version = value
        break
      case 'description':
        meta.description = value
        break
      case 'author':
        meta.author = value
        break
      case 'match':
        meta.matches.push(value)
        break
      case 'exclude':
        meta.excludes.push(value)
        break
      case 'include':
        meta.includes.push(value)
        break
      case 'require': {
        const url = value
        if (!meta.requires.some((r) => r.url === url)) {
          meta.requires.push({ url })
        }
        break
      }
      case 'resource': {
        const parts = value.match(/^(\S+)\s+(\S+)/)
        if (parts) {
          const [, name, url] = parts
          if (!meta.resources.some((r) => r.name === name)) {
            meta.resources.push({ name, url })
          }
        }
        break
      }
      case 'grant':
        meta.grants.push(value as UserScriptGrant)
        break
      case 'run-at':
      case 'run_at': {
        const runAt = value.toLowerCase()
        if (['document-start', 'document-end', 'document-idle'].includes(runAt)) {
          meta.runAt = runAt as UserScriptRunAt
        }
        break
      }
      case 'noframes':
        meta.noframes = true
        break
      case 'icon':
      case 'iconurl':
      case 'defaulticon':
        if (!meta.icon) meta.icon = value
        break
      case 'downloadurl':
      case 'download-url':
        meta.downloadURL = value
        break
      case 'updateurl':
      case 'update-url':
        meta.updateURL = value
        break
      case 'supporturl':
      case 'support-url':
        meta.supportURL = value
        break
      case 'homepage':
      case 'homepageurl':
      case 'homepage-url':
      case 'website':
        meta.homepageURL = value
        break
      case 'license':
        meta.license = value
        break
      case 'connect':
        meta.connect.push(value)
        break
    }

    match = DIRECTIVE_RE.exec(block)
  }

  return meta
}

export function generateMetadataBlock(meta: Partial<IUserScriptMetadata>): string {
  const lines: string[] = ['// ==UserScript==']

  if (meta.name) lines.push(`// @name         ${meta.name}`)
  if (meta.namespace) lines.push(`// @namespace    ${meta.namespace}`)
  if (meta.version) lines.push(`// @version      ${meta.version}`)
  if (meta.description) lines.push(`// @description  ${meta.description}`)
  if (meta.author) lines.push(`// @author       ${meta.author}`)

  for (const m of meta.matches || []) {
    lines.push(`// @match        ${m}`)
  }
  for (const e of meta.excludes || []) {
    lines.push(`// @exclude      ${e}`)
  }
  for (const i of meta.includes || []) {
    lines.push(`// @include      ${i}`)
  }
  for (const r of meta.requires || []) {
    lines.push(`// @require      ${r.url}`)
  }
  for (const r of meta.resources || []) {
    lines.push(`// @resource     ${r.name} ${r.url}`)
  }
  for (const g of meta.grants || []) {
    lines.push(`// @grant        ${g}`)
  }
  if (meta.noframes) {
    lines.push('// @noframes')
  }
  for (const c of meta.connect || []) {
    lines.push(`// @connect      ${c}`)
  }

  lines.push('// ==/UserScript==')
  return lines.join('\n')
}

export function metadataToPartialScript(meta: IUserScriptMetadata): Partial<{
  name: string
  matches: string[]
  excludes: string[]
  includes: string[]
  namespace: string
  version: string
  description: string
  author: string
  requires: IUserScriptRequire[]
  resources: IUserScriptResource[]
  grants: UserScriptGrant[]
  runAt: UserScriptRunAt
  noframes: boolean
  icon: string
  downloadURL: string
  updateURL: string
  supportURL: string
  homepageURL: string
  license: string
  connect: string[]
}> {
  return {
    name: meta.name,
    matches: meta.matches,
    excludes: meta.excludes,
    includes: meta.includes,
    namespace: meta.namespace,
    version: meta.version,
    description: meta.description,
    author: meta.author,
    requires: meta.requires,
    resources: meta.resources,
    grants: meta.grants,
    runAt: meta.runAt,
    noframes: meta.noframes || undefined,
    icon: meta.icon,
    downloadURL: meta.downloadURL,
    updateURL: meta.updateURL,
    supportURL: meta.supportURL,
    homepageURL: meta.homepageURL,
    license: meta.license,
    connect: meta.connect,
  }
}
