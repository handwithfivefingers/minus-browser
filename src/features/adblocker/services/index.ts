import { WebContentsView } from 'electron'

export class AdblockService {
  constructor() {}
  injectYoutubeAdblockSponsor(webContents: WebContentsView['webContents']) {
    // Scripts moved to built-in userscripts in UserScriptController.
    // Injection is now handled by the userscript plugin for matching pages.
    console.debug('[AdblockService] YouTube scripts are now injected via built-in userscripts')
  }
}
