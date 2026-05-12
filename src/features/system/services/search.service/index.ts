import { BrowserWindow } from "electron";
import { Tab } from "../../classes/tab";

export interface ISearchParams {
  tab: Tab;
  queryParams: {
    query: string;
    forward?: boolean;
    findNext?: boolean;
    matchCase?: boolean;
  };
}

export class SearchServices {
  onSearchPage({ tab, queryParams }: ISearchParams) {
    if (!tab) return;
    if (!queryParams?.query?.trim()) {
      tab.webContents.stopFindInPage("clearSelection");
      return;
    }

    tab.webContents.findInPage(queryParams.query, {
      forward: queryParams.forward ?? true,
      findNext: queryParams.findNext ?? false,
      matchCase: queryParams.matchCase ?? false,
    });

    // Forward results back to renderer
    tab.webContents.once("found-in-page", (_event, result) => {
      const window = BrowserWindow.getFocusedWindow();
      window?.webContents.send("FOUND_IN_PAGE", {
        activeMatchOrdinal: result.activeMatchOrdinal,
        matches: result.matches,
        finalUpdate: result.finalUpdate,
      });
    });
  }
  //   async showSearchBar(tab: Tab) {
  //     if (!tab) return;
  //     await tab?.webContents.executeJavaScript(
  //       `
  //     (() => {
  //       const ID = "__minus_search_bar";
  //       if (document.getElementById(ID)) return;
  //       const bar = document.createElement("div");
  //       bar.id = ID;
  //       bar.style.cssText = \`
  //         position: fixed; top: 0; right: 0; z-index: 2147483647;
  //         background: #fff; border: 1px solid #ddd;
  //         border-radius: 0 0 0 8px; padding: 8px 12px;
  //         display: flex; align-items: center; gap: 8px;
  //         font-family: system-ui; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,.15);
  //       \`;
  //       bar.innerHTML = \`
  //         <input id="__minus_search_input" placeholder="Find…"
  //           style="width:200px;height:26px;padding:0 8px;border:1px solid #ccc;border-radius:4px;outline:none"/>
  //         <span id="__minus_search_count" style="font-size:12px;color:#888;min-width:50px"></span>
  //         <button id="__minus_search_prev" style="border:1px solid #ccc;border-radius:4px;outline:none;background:#f5f5f5">
  //         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-arrow-narrow-up">
  //             <path stroke="none" d="M0 0h24v24H0z" fill="none" />
  //             <path d="M12 5l0 14" />
  //             <path d="M16 9l-4 -4" />
  //             <path d="M8 9l4 -4" />
  //         </svg>
  //         </button>
  //         <button id="__minus_search_next" style="border:1px solid #ccc;border-radius:4px;outline:none;background:#f5f5f5">
  //             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-arrow-narrow-down">
  //                 <path stroke="none" d="M0 0h24v24H0z" fill="none" />
  //                 <path d="M12 5l0 14" />
  //                 <path d="M16 15l-4 4" />
  //                 <path d="M8 15l4 4" />
  //             </svg>
  //         </button>
  //         <button id="__minus_search_close" style="border:1px solid #ccc;border-radius:4px;outline:none;background:#f5f5f5">
  //             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-x">
  //                 <path stroke="none" d="M0 0h24v24H0z" fill="none" />
  //                 <path d="M18 6l-12 12" />
  //                 <path d="M6 6l12 12" />
  //             </svg>
  //         </button>
  //       \`;
  //       document.documentElement.appendChild(bar);

  //       const input = document.getElementById("__minus_search_input");
  //       // Signal back to main process via console so tab.ts can forward it
  //       input.addEventListener("input", e => {
  //         console.log("__MINUS_SEARCH__:" + JSON.stringify({ query: e.target.value }));
  //       });
  //       document.getElementById("__minus_search_prev").onclick = () =>
  //         console.log("__MINUS_SEARCH_PREV__");
  //       document.getElementById("__minus_search_next").onclick = () =>
  //         console.log("__MINUS_SEARCH_NEXT__");
  //       document.getElementById("__minus_search_close").onclick = () =>
  //         console.log("__MINUS_SEARCH_CLOSE__");
  //       input.focus();
  //     })();
  //   `,
  //       true,
  //     );
  //   }


  

  async showSearchBar(tab: Tab) {
    if (!tab) return;
    await tab?.webContents.executeJavaScript(
      `
    (() => {
      const ID = "__minus_search_bar";
      if (document.getElementById(ID)) {
        const input = document.getElementById("__minus_search_input");
        if (input) { input.focus(); input.select(); }
        return;
      }

      const style = document.createElement("style");
      style.id = "__minus_search_style";
      style.textContent = \`
        #__minus_search_bar {
          position: fixed;
          top: 0;
          right: 0;
          z-index: 2147483647;
          background: #fff;
          color: #1a1a1a;
          border: 1px solid #d0d0d0;
          border-top: none;
          border-right: none;
          border-radius: 0 0 0 10px;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 13px;
          box-shadow: -2px 2px 12px rgba(0,0,0,.18);
          min-width: 340px;
          user-select: none;
        }
        #__minus_search_input {
          flex: 1;
          height: 28px;
          padding: 0 10px;
          border: 1px solid #d0d0d0;
          border-radius: 5px;
          font-size: 13px;
          outline: none;
          background: #f7f7f7;
          color: #1a1a1a;
          transition: border-color 0.15s;
        }
        #__minus_search_input:focus {
          border-color: #4a90e2;
          background: #fff;
        }
        #__minus_search_input.no-match {
          border-color: #e24a4a;
          background: #fff0f0;
        }
        #__minus_search_count {
          font-size: 12px;
          color: #888;
          min-width: 56px;
          text-align: center;
          white-space: nowrap;
        }
        #__minus_search_count.no-match { color: #e24a4a; }
        .minus-search-btn {
          width: 26px;
          height: 26px;
          border: 1px solid #d0d0d0;
          border-radius: 5px;
          background: #f0f0f0;
          color: #333;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: background 0.1s;
        }
        .minus-search-btn:hover { background: #e0e0e0; }
        .minus-search-btn:active { background: #d0d0d0; }
        #__minus_search_close {
          color: #666;
          font-size: 15px;
          margin-left: 2px;
        }
        @media (prefers-color-scheme: dark) {
          #__minus_search_bar {
            background: #2a2a2a;
            color: #e8e8e8;
            border-color: #444;
            box-shadow: -2px 2px 12px rgba(0,0,0,.4);
          }
          #__minus_search_input {
            background: #1e1e1e;
            color: #e8e8e8;
            border-color: #555;
          }
          #__minus_search_input:focus { border-color: #4a90e2; background: #252525; }
          #__minus_search_input.no-match { background: #2a1a1a; border-color: #e24a4a; }
          #__minus_search_count { color: #aaa; }
          .minus-search-btn {
            background: #383838;
            color: #ddd;
            border-color: #555;
          }
          .minus-search-btn:hover { background: #444; }
          #__minus_search_close { color: #aaa; }
        }
      \`;
      document.head.appendChild(style);

      const bar = document.createElement("div");
      bar.id = ID;
      bar.innerHTML = \`
        <input id="__minus_search_input" placeholder="Find in page…" autocomplete="off" spellcheck="false" />
        <span id="__minus_search_count"></span>
        <button class="minus-search-btn" id="__minus_search_prev" title="Previous (Shift+Enter)">↑</button>
        <button class="minus-search-btn" id="__minus_search_next" title="Next (Enter)">↓</button>
        <button class="minus-search-btn" id="__minus_search_close" title="Close (Escape)">✕</button>
      \`;
      document.documentElement.appendChild(bar);

      const input = document.getElementById("__minus_search_input");

      input.addEventListener("keydown", (e) => {
        e.stopPropagation(); // prevent page shortcuts while typing
        if (e.key === "Enter") {
          e.preventDefault();
          const forward = !e.shiftKey;
          console.log("__MINUS_SEARCH__:" + JSON.stringify({ query: input.value, findNext: true, forward }));
        }
        if (e.key === "Escape") {
          e.preventDefault();
          console.log("__MINUS_SEARCH_CLOSE__");
        }
      });

      document.getElementById("__minus_search_prev").addEventListener("click", () => {
        console.log("__MINUS_SEARCH__:" + JSON.stringify({ query: input.value, findNext: true, forward: false }));
      });

      document.getElementById("__minus_search_next").addEventListener("click", () => {
        console.log("__MINUS_SEARCH__:" + JSON.stringify({ query: input.value, findNext: true, forward: true }));
      });

      document.getElementById("__minus_search_close").addEventListener("click", () => {
        console.log("__MINUS_SEARCH_CLOSE__");
      });

      // Intercept Ctrl/Cmd+F on the page to re-focus bar instead of default
      document.addEventListener("keydown", (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "f") {
          const bar = document.getElementById("__minus_search_bar");
          if (bar) {
            e.preventDefault();
            e.stopPropagation();
            input.focus();
            input.select();
          }
        }
      }, true);

      input.focus();
    })();
  `,
      true,
    );
  }
}
