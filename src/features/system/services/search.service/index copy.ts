import { BrowserWindow, WebContentsView } from "electron";
import { Tab } from "../../models/tab";

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
  tab: Tab;
  searchBarVisible = false;
  searchBarRegistered = false;
  constructor(tab: Tab) {
    this.tab = tab;
    this.registerSearchBar();
  }
  updateSearchCount(activeMatchOrdinal: number, matches: number) {
    if (!this.searchBarVisible) return;
    const noMatch = matches === 0;
    const text = noMatch ? "no results" : `${activeMatchOrdinal} / ${matches}`;
    this.tab.view.webContents
      .executeJavaScript(
        `
    (() => {
      const count = document.getElementById("__minus_search_count");
      const input = document.getElementById("__minus_search_input");
      if (count) {
        count.textContent = ${JSON.stringify(text)};
        count.classList.toggle("no-match", ${noMatch});
      }
      if (input) {
        input.classList.toggle("no-match", ${noMatch});
      }
    })();
  `,
        true,
      )
      .catch(() => {});
  }
  onSearchPage() {
    this.tab.view.webContents.on("console-message", (_event, _level, message) => {
      if (message === "__MINUS_SEARCH_CLOSE__") {
        // this.hideSearchBar();
        const browser = BrowserWindow.getFocusedWindow();
        browser?.webContents?.send(`SEARCH_BAR_CLOSED:${this.tab.id}`);
        return;
      }

      if (message.startsWith("__MINUS_SEARCH__:")) {
        try {
          const payload = JSON.parse(message.slice("__MINUS_SEARCH__:".length)) as {
            query: string;
            findNext: boolean;
            forward: boolean;
          };
          const { query, findNext, forward } = payload;

          if (!query?.trim()) {
            this.tab.view.webContents.stopFindInPage("clearSelection");
            this.updateSearchCount(0, 0);
            return;
          }

          this.tab.view.webContents.findInPage(query, { forward, findNext, matchCase: false });
          setTimeout(() => {
            this.tab.view.webContents
              .executeJavaScript(
                `
              (() => {
                const input = document.getElementById("__minus_search_input");
                if (input) {
                  requestAnimationFrame(() => requestAnimationFrame(() => input.focus()));
                }
              })();
            `,
                true,
              )
              .catch(() => {});
          }, 50);
        } catch (_) {}
      }
      if (message.startsWith("__MINUS_SEARCH_NAV__:")) {
        try {
          const { query, forward } = JSON.parse(message.slice("__MINUS_SEARCH_NAV__:".length));
          if (!query?.trim()) return;
          this.tab.view.webContents.findInPage(query, {
            forward,
            findNext: true, // always true for nav — advances through results
            matchCase: false,
          });
          // Re-focus the injected input after findInPage is dispatched.
          // Two nested setTimeouts mirror the double-RAF in the page.
          setTimeout(() => {
            this.tab.view.webContents
              .executeJavaScript(
                `
                    (() => {
                    const input = document.getElementById("__minus_search_input");
                    if (input) {
                        requestAnimationFrame(() => requestAnimationFrame(() => input.focus()));
                    }
                    })();
                `,
                true,
              )
              .catch((err) => {
                console.error("Error occurred while executing JavaScript:", err);
              });
          }, 50);
        } catch (_) {
          console.error("_Error occurred while executing JavaScript:", _);
        }
        return;
      }
    });

    // Handle found-in-page result — update count display in the injected bar
    this.tab.view.webContents.on("found-in-page", (_event, result) => {
      if (!this.searchBarVisible) return;
      if (result.finalUpdate) {
        this.updateSearchCount(result.activeMatchOrdinal ?? 0, result.matches ?? 0);
        // Forward to renderer so React toolbar can optionally show count too
        const browser = BrowserWindow.getFocusedWindow();
        browser?.webContents?.send(`FOUND_IN_PAGE:${this.tab.id}`, {
          activeMatchOrdinal: result.activeMatchOrdinal,
          matches: result.matches,
        });
      }
    });

    // Close search bar when the page navigates away
    this.tab.view.webContents.on("did-navigate", () => {
      if (this.searchBarVisible) this.hideSearchBar();
    });
    this.tab.view.webContents.on("did-navigate-in-page", () => {
      if (this.searchBarVisible) this.hideSearchBar();
    });
  }

  async hideSearchBar() {
    this.searchBarVisible = false;
    try {
      await this.tab.view.webContents.executeJavaScript(
        `
      (() => {
        const bar = document.getElementById("__minus_search_bar");
        const style = document.getElementById("__minus_search_style");
        if (bar) bar.remove();
        if (style) style.remove();
      })();
    `,
        true,
      );
    } catch (_) {}
    this.tab.view.webContents.stopFindInPage("clearSelection");
  }

  async registerSearchBar() {
    if (!this.tab) return;
    // this.searchBarVisible = true;
    if (this.searchBarRegistered) return;
    this.searchBarRegistered = true;
    await this.tab?.webContents.executeJavaScript(
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

      const triggerSearch = (forward) => {
        const query = input.value;
        if (!query.trim()) return;
        // Write intent to window so main can poll it
        window.__minusSearchIntent = { query, forward, ts: Date.now() };
        console.log("__MINUS_SEARCH_NAV__:" + JSON.stringify({ query, forward }));
        // Immediately re-grab focus before Electron can steal it
        input.focus();
        // Double-RAF as insurance
        refocus();
      };

        const refocus = () => {
            // requestAnimationFrame ensures focus runs AFTER Electron's
            // internal findInPage focus steal resolves
            requestAnimationFrame(() => {
                input.focus();
            });
        };

        input.addEventListener("keydown", (e) => {
            e.stopPropagation();
            if (e.key === "Enter") {
            e.preventDefault();
            triggerSearch(!e.shiftKey);
            }
            if (e.key === "Escape") {
            e.preventDefault();
            console.log("__MINUS_SEARCH_CLOSE__");
            }
        });

    //   input.addEventListener("keydown", (e) => {
    //     e.stopPropagation(); // prevent page shortcuts while typing
    //     if (e.key === "Enter") {
    //       e.preventDefault();
    //       const forward = !e.shiftKey;
    //       console.log("__MINUS_SEARCH__:" + JSON.stringify({ query: input.value, findNext: true, forward }));
    //     }
    //     if (e.key === "Escape") {
    //       e.preventDefault();
    //       console.log("__MINUS_SEARCH_CLOSE__");
    //     }
    //   });

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
