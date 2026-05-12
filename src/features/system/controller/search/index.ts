import { ISearchParams, SearchServices } from "../../services/search.service";
import { TabController } from "../tab";

export class SearchController {
  tabController: TabController | undefined = undefined;
  constructor(tabController: TabController) {
    this.tabController = tabController;
  }
  searchPage(queryParams: ISearchParams["queryParams"]) {
    const activeTab = this.tabController?.activeTab;
    return new SearchServices().onSearchPage({
      tab: activeTab!,
      queryParams,
    });
  }

  stopSearch() {
    const activeTab = this.tabController?.activeTab;
    activeTab?.webContents.stopFindInPage("clearSelection");
  }

  showSearchBar() {
    const activeTab = this.tabController?.activeTab;
    return new SearchServices().showSearchBar(activeTab!);
  }
}
