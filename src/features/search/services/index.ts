import { WebContentsView } from "electron";

const SEARCH_BAR_SCRIPT = `
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
  (document.head || document.documentElement).appendChild(style);

  const bar = document.createElement("div");
  bar.id = ID;
  bar.innerHTML = \`
    <input id="__minus_search_input" placeholder="Find in page..." autocomplete="off" spellcheck="false" />
    <span id="__minus_search_count"></span>
    <button class="minus-search-btn" id="__minus_search_prev" title="Previous (Shift+Enter)">^</button>
    <button class="minus-search-btn" id="__minus_search_next" title="Next (Enter)">v</button>
    <button class="minus-search-btn" id="__minus_search_close" title="Close (Escape)">x</button>
  \`;
  document.documentElement.appendChild(bar);

  const input = document.getElementById("__minus_search_input");
  const search = (forward,findNext = true) => {
    console.log("__MINUS_SEARCH__:" + JSON.stringify({ query: input.value, findNext, forward }));
    requestAnimationFrame(() => requestAnimationFrame(() => input.focus()));
  };

  input.addEventListener("input", () => search(true, false));
  input.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      search(!event.shiftKey, true);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      console.log("__MINUS_SEARCH_CLOSE__");
    }
  });

  document.getElementById("__minus_search_prev").addEventListener("click", () => search(false));
  document.getElementById("__minus_search_next").addEventListener("click", () => search(true));
  document.getElementById("__minus_search_close").addEventListener("click", () => {
    console.log("__MINUS_SEARCH_CLOSE__");
  });

  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "f") {
      const bar = document.getElementById("__minus_search_bar");
      if (bar) {
        event.preventDefault();
        event.stopPropagation();
        input.focus();
        input.select();
      }
    }
  }, true);

  input.focus();

  console.log("__MINUS_SEARCH_OPEN__");
})();
`;

export class SearchService {
  async showSearchBar(view: WebContentsView) {
    const result = await view.webContents.executeJavaScript(SEARCH_BAR_SCRIPT, true).catch((e) => {
      console.error("[Search] Failed to inject search bar:", e?.message || e);
      return false;
    });
    return result !== false;
  }

  async hideSearchBar(view: WebContentsView) {
    await view.webContents
      .executeJavaScript(
        `
      (() => {
        const bar = document.getElementById("__minus_search_bar");
        const style = document.getElementById("__minus_search_style");
        if (bar) bar.remove();
        if (style) style.remove();
      })();
    `,
        true,
      )
      .catch(() => {});
    view.webContents.stopFindInPage("clearSelection");
  }

  async updateSearchCount(webContents: Electron.WebContents, activeMatchOrdinal: number, matches: number) {
    const noMatch = matches === 0;
    const text = noMatch ? "no results" : `${activeMatchOrdinal} / ${matches}`;
    await webContents
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
          requestAnimationFrame(() => requestAnimationFrame(() => input.focus()));
        }
      })();
    `,
        true,
      )
      .catch(() => {});
  }
}
