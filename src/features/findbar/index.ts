export const FINDBAR_HTML = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      html,
      body {
        height: 100%;
        margin: 0;
        padding: 0;
      }
      body {
        display: flex;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        overflow: hidden;
        background: var(--bg);
        color: var(--fg);
        --bg: #e9e9e9;
        --fg: #222;
        --border: #c0c0c0;
        --input-bg: transparent;
        --input-border: #b0b0b0;
        --input-focus: #1967d2;
        --btn-hover: #d9d9d9;
        --btn-active: #c7c7c7;
        --count: #666;
        --divider: #c0c0c0;
      }
      @media (prefers-color-scheme: dark) {
        body {
          --bg: #2d2d2d;
          --fg: #e0e0e0;
          --border: #555;
          --input-bg: transparent;
          --input-border: #666;
          --input-focus: #8ab4f8;
          --btn-hover: #404040;
          --btn-active: #505050;
          --count: #999;
          --divider: #555;
        }
      }
      #app {
        display: flex;
        align-items: center;
        gap: 0;
        padding: 0 0 0 8px;
        width: 100%;
        height: 100%;
      }
      .input-wrap {
        display: flex;
        align-items: center;
        flex: 1;
        min-width: 0;
      }
      .search-icon {
        width: 16px;
        height: 16px;
        margin-right: -20px;
        z-index: 1;
        pointer-events: none;
        opacity: 0.5;
        color: var(--fg);
      }
      .search-icon svg {
        display: block;
      }
      input {
        flex: 1;
        height: 22px;
        padding: 0 4px 0 22px;
        border: 1px solid var(--input-border);
        border-radius: 3px;
        font-size: 12px;
        outline: none;
        background: var(--input-bg);
        color: var(--fg);
        min-width: 60px;
        width: 140px;
        border-color:transparent;
      }
      input:focus {
        // border-color: var(--input-focus);
        border-color:transparent;
      }
      input.no-match {
        background: #fce8e6;
        border-color: #d93025;
      }
      @media (prefers-color-scheme: dark) {
        input.no-match {
          background: #3c1f1e;
          border-color: #f28b82;
        }
      }
      #count {
        font-size: 11px;
        color: var(--count);
        min-width: 38px;
        text-align: center;
        user-select: none;
        margin: 0 2px;
      }
      #count.no-match {
        color: #d93025;
      }
      .divider {
        width: 1px;
        height: 18px;
        background: var(--divider);
        margin: 0 4px;
      }
      .btn {
        width: 26px;
        height: 26px;
        border: none;
        border-radius: 0;
        background: transparent;
        color: var(--fg);
        cursor: default;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        user-select: none;
        transition: background 80ms;
      }
      .btn:hover {
        background: var(--btn-hover);
      }
      .btn:active {
        background: var(--btn-active);
      }
      .btn svg {
        display: block;
      }
      #match-case {
        padding: 0;
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.02em;
      }
      #match-case.active {
        background: var(--btn-hover);
      }
      #close {
        margin-left: 2px;
      }
      #close svg {
        opacity: 0.6;
      }
      #close:hover svg {
        opacity: 1;
      }
    </style>
  </head>
  <body>
    <div id="app">
      <div class="input-wrap">
        <span class="search-icon">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input id="input" type="text" autocomplete="off" spellcheck="false" />
      </div>
      <span id="count"></span>
      <div class="divider"></div>
      <button class="btn" id="prev" title="Previous match (Shift+Enter)">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
      <button class="btn" id="next" title="Next match (Enter)">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div class="divider"></div>
      <button class="btn" id="match-case" title="Match case">Aa</button>
      <button class="btn" id="close" title="Close (Esc)">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
    <script>
      const api = window.findbarAPI;
      if (!api) document.body.innerHTML = '<div style="padding:12px;color:red">Findbar API unavailable</div>';
      const input = document.getElementById("input");
      const countEl = document.getElementById("count");
      const prevBtn = document.getElementById("prev");
      const nextBtn = document.getElementById("next");
      const closeBtn = document.getElementById("close");
      const matchCaseBtn = document.getElementById("match-case");
      let matchCase = false;
      let inputTimer = null;
      api.onMatches(function (active, total) {
        if (total === 0 && input.value) {
          countEl.textContent = "0\/0";
          countEl.classList.add("no-match");
          input.classList.add("no-match");
        } else if (total > 0) {
          countEl.textContent = active + "\/" + total;
          countEl.classList.remove("no-match");
          input.classList.remove("no-match");
        } else {
          countEl.textContent = "";
          countEl.classList.remove("no-match");
          input.classList.remove("no-match");
        }
      });
      api.onFocusInput(function () {
        input.focus();
        input.select();
      });
      input.addEventListener("input", function () {
        clearTimeout(inputTimer);
        inputTimer = setTimeout(function () {
          api.textChange(input.value);
        }, 50);
      });
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          if (e.shiftKey) {
            api.findPrevious();
          } else {
            api.findNext();
          }
        }
        if (e.key === "Escape") {
          e.preventDefault();
          api.close();
        }
      });
      prevBtn.addEventListener("click", function () {
        api.findPrevious();
      });
      nextBtn.addEventListener("click", function () {
        api.findNext();
      });
      closeBtn.addEventListener("click", function () {
        api.close();
      });
      matchCaseBtn.addEventListener("click", function () {
        matchCase = !matchCase;
        matchCaseBtn.classList.toggle("active", matchCase);
        api.matchCase(matchCase);
        if (input.value) api.textChange(input.value);
      });
      prevBtn.addEventListener("mouseenter", function () {
        this.classList.add("hover");
      });
      prevBtn.addEventListener("mouseleave", function () {
        this.classList.remove("hover");
      });
      nextBtn.addEventListener("mouseenter", function () {
        this.classList.add("hover");
      });
      nextBtn.addEventListener("mouseleave", function () {
        this.classList.remove("hover");
      });
      setTimeout(function () {
        input.focus();
      }, 0);
    </script>
  </body>
</html>
`