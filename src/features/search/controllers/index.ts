import { WebContentsView } from 'electron'

import { eventStore } from '~/main/core/stores'

import { SearchService } from '../services'

export class SearchController {
  activeView: WebContentsView | null = null

  constructor(private readonly service: SearchService = new SearchService()) {
    eventStore.listen('viewChanges', (view: WebContentsView | undefined) => {
      this.activeView = view || null
    })
  }

  async showSearchBar() {
    if (!this.activeView) return
    return this.service.showSearchBar(this.activeView)
  }

  async stopSearch() {
    if (!this.activeView) return
    await this.service.hideSearchBar(this.activeView)
    eventStore.broadcast('searchBarClosed', true)
  }

  searchPage(queryParams: { query: string; forward?: boolean; findNext?: boolean; matchCase?: boolean }) {
    if (!this.activeView) return
    if (!queryParams?.query?.trim()) {
      this.activeView.webContents.stopFindInPage('clearSelection')
      return
    }
    this.activeView.webContents.findInPage(queryParams.query, {
      forward: queryParams.forward ?? true,
      findNext: queryParams.findNext ?? false,
      matchCase: queryParams.matchCase ?? false,
    })
  }
}

export const searchController = new SearchController()
