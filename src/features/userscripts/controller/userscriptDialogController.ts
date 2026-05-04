export class UserScriptDialogController {
  /**
   * @description: Waiting for Dialog action, result will return after close dialog
   * @returns Array[]
   */
  async openManager(webContents: Electron.WebContents, scripts: any[]) {
    try {
      const result = await webContents.executeJavaScript(
        `(() => {
        const input = ${JSON.stringify(scripts)};
        return new Promise((resolve) => {
          const rootId = "__minus_script_manager";
          const old = document.getElementById(rootId);
          if (old) old.remove();
          const root = document.createElement("div");
          root.id = rootId;
          root.style.position = "fixed";
          root.style.inset = "0";
          root.style.zIndex = "2147483647";
          root.style.background = "rgba(0,0,0,.45)";
          root.style.display = "flex";
          root.style.alignItems = "center";
          root.style.justifyContent = "center";
          root.style.fontFamily = "sans-serif";
          root.style.fontSize = "12px";

          const panel = document.createElement("div");
          panel.style.width = "900px";
          panel.style.maxWidth = "94vw";
          panel.style.height = "72vh";
          panel.style.background = "#fff";
          panel.style.borderRadius = "12px";
          panel.style.display = "grid";
          panel.style.gridTemplateColumns = "300px 1fr";
          panel.style.overflow = "hidden";
          panel.style.position = "relative";
          const close = (value) => {
            root.remove();
            document.removeEventListener("keydown", onKeyDown);
            resolve(value);
          };
          const onKeyDown = (event) => {
            if (event.key === "Escape") close(items);
          };
          document.addEventListener("keydown", onKeyDown);
          root.addEventListener("click", () => close(items));
          panel.addEventListener("click", (event) => event.stopPropagation());
          const closeBtn = document.createElement("button");
          closeBtn.textContent = "×";
          closeBtn.style.position = "absolute";
          closeBtn.style.top = "8px";
          closeBtn.style.right = "8px";
          closeBtn.style.width = "20px";
          closeBtn.style.height = "20px";
          closeBtn.style.display = "inline-flex";
          closeBtn.style.alignItems = "center";
          closeBtn.style.justifyContent = "center";
          closeBtn.style.border = "0";
          closeBtn.style.background = "#e2e8f0";
          closeBtn.style.borderRadius = "4px";
          closeBtn.style.fontSize = "16px";
          closeBtn.style.color = "#334155";
          closeBtn.style.cursor = "pointer";
          closeBtn.addEventListener("mouseenter", () => {
            closeBtn.style.background = "#cbd5e1";
            closeBtn.style.color = "#0f172a";
          });
          closeBtn.addEventListener("mouseleave", () => {
            closeBtn.style.background = "#e2e8f0";
            closeBtn.style.color = "#334155";
          });
          closeBtn.onclick = () => close(items);
          panel.appendChild(closeBtn);

          const left = document.createElement("div");
          left.style.borderRight = "1px solid #e2e8f0";
          left.style.padding = "10px";
          left.style.overflow = "auto";
          const right = document.createElement("div");
          right.style.padding = "10px";
          right.style.display = "flex";
          right.style.flexDirection = "column";
          right.style.gap = "8px";

          let items = (input || []).map((item) => ({ ...item }));
          let selectedId = items[0] ? items[0].id : null;
          const uid = () => "new-" + Math.random().toString(36).slice(2);
          const getSelected = () => items.find((item) => item.id === selectedId);
          const icon = {
            plus: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
            trash: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></svg>',
            check: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 5 5L20 7"/></svg>',
            x: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
            disk: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>'
          };
          const applyButtonBase = (btn) => {
            btn.style.display = "inline-flex";
            btn.style.alignItems = "center";
            btn.style.gap = "6px";
            btn.style.fontSize = "12px";
            btn.style.lineHeight = "1";
          };
          const setHover = (el, normalBg, hoverBg, normalColor, hoverColor) => {
            el.style.background = normalBg;
            if (normalColor) el.style.color = normalColor;
            el.addEventListener("mouseenter", () => {
              el.style.background = hoverBg;
              if (hoverColor) el.style.color = hoverColor;
            });
            el.addEventListener("mouseleave", () => {
              el.style.background = normalBg;
              if (normalColor) el.style.color = normalColor;
            });
          };
          const parseMeta = (source) => {
            const lines = String(source || "").split("\\n");
            let name = "Unnamed Script";
            let match = "*://*/*";
            let runAt = "document-end";
            lines.forEach((line) => {
              const n = line.match(/^\\/\\/\\s*@name\\s+(.+)$/);
              const m = line.match(/^\\/\\/\\s*@match\\s+(.+)$/);
              const r = line.match(/^\\/\\/\\s*@run-at\\s+(.+)$/);
              if (n && n[1]) name = n[1].trim();
              if (m && m[1]) match = m[1].trim();
              if (r && r[1]) runAt = r[1].trim();
            });
            return { name, match, runAt };
          };
          const withMeta = (source, meta) => {
            const src = String(source || "");
            const blockRegex = /\\/\\/\\s*==UserScript==[\\s\\S]*?\\/\\/\\s*==\\/UserScript==\\n?/m;
            const nextBlock =
              "// ==UserScript==\\n" +
              "// @name " + (meta.name || "New Script") + "\\n" +
              "// @match " + (meta.match || "*://*/*") + "\\n" +
              "// @run-at " + (meta.runAt || "document-end") + "\\n" +
              "// ==/UserScript==\\n";
            if (blockRegex.test(src)) return src.replace(blockRegex, nextBlock);
            return nextBlock + src;
          };
          items = items.map((item) => {
            const parsed = parseMeta(item.source);
            return { ...item, name: item.name || parsed.name, domain: (item.matches && item.matches[0]) || parsed.match, runAt: item.runAt || parsed.runAt || "document-end" };
          });

          const renderList = () => {
            left.innerHTML = "";
            const title = document.createElement("div");
            title.textContent = "Tampermonkey Scripts";
            title.style.fontWeight = "600";
            title.style.marginBottom = "8px";
            left.appendChild(title);
            const addBtn = document.createElement("button");
            addBtn.innerHTML = icon.plus + "<span>New Script</span>";
            applyButtonBase(addBtn);
            addBtn.style.border = "0";
            addBtn.style.background = "#4f46e5";
            addBtn.style.color = "#fff";
            addBtn.style.padding = "6px 10px";
            addBtn.style.borderRadius = "6px";
            addBtn.style.cursor = "pointer";
            addBtn.style.marginBottom = "8px";
            setHover(addBtn, "#4f46e5", "#4338ca", "#fff", "#fff");
            addBtn.onclick = () => {
              const item = { id: uid(), source: "// ==UserScript==\\n// @name New Script\\n// @match *://*/*\\n// @run-at document-end\\n// ==/UserScript==\\n", name: "New Script", domain: "*://*/*", runAt: "document-end", enabled: false };
              items.unshift(item); selectedId = item.id; renderList(); renderForm();
            };
            left.appendChild(addBtn);
            items.forEach((item) => {
              const btn = document.createElement("button");
              btn.textContent = (item.name || "Unnamed Script") + (item.enabled ? " (ON)" : " (OFF)");
              btn.style.display = "block"; btn.style.width = "100%"; btn.style.textAlign = "left";
              btn.style.marginBottom = "6px"; btn.style.border = "0"; btn.style.padding = "8px";
              btn.style.borderRadius = "6px"; btn.style.cursor = "pointer";
              btn.style.background = selectedId === item.id ? "#e0e7ff" : "#f1f5f9";
              btn.onclick = () => { selectedId = item.id; renderList(); renderForm(); };
              left.appendChild(btn);
            });
          };

          const renderForm = () => {
            right.innerHTML = "";
            const selected = getSelected();
            const title = document.createElement("div");
            title.textContent = "Edit Script";
            title.style.fontWeight = "600";
            right.appendChild(title);
            if (!selected) return;
            const formRow = document.createElement("div");
            formRow.style.display = "grid";
            formRow.style.gridTemplateColumns = "1fr auto auto";
            formRow.style.gap = "8px";
            formRow.style.alignItems = "end";
            const domainWrap = document.createElement("label");
            domainWrap.style.display = "flex"; domainWrap.style.flexDirection = "column"; domainWrap.style.gap = "4px";
            const domainLabel = document.createElement("span"); domainLabel.textContent = "Domain Match";
            const domainInput = document.createElement("input");
            domainInput.value = selected.domain || "*://*/*";
            domainInput.style.border = "1px solid #cbd5e1"; domainInput.style.padding = "7px"; domainInput.style.borderRadius = "6px"; domainInput.style.fontSize = "12px";
            domainWrap.appendChild(domainLabel); domainWrap.appendChild(domainInput);
            const runAtWrap = document.createElement("label");
            runAtWrap.style.display = "flex"; runAtWrap.style.flexDirection = "column"; runAtWrap.style.gap = "4px";
            const runAtLabel = document.createElement("span"); runAtLabel.textContent = "Run At";
            const runAtSelect = document.createElement("select");
            runAtSelect.style.border = "1px solid #cbd5e1"; runAtSelect.style.padding = "7px"; runAtSelect.style.borderRadius = "6px"; runAtSelect.style.fontSize = "12px";
            ["document-start","document-end","document-idle"].forEach((value) => { const op = document.createElement("option"); op.value = value; op.textContent = value; runAtSelect.appendChild(op);});
            runAtSelect.value = selected.runAt || "document-end";
            runAtWrap.appendChild(runAtLabel); runAtWrap.appendChild(runAtSelect);
            const switchWrap = document.createElement("label");
            switchWrap.style.display = "flex"; switchWrap.style.flexDirection = "column"; switchWrap.style.gap = "4px";
            const switchLabel = document.createElement("span"); switchLabel.textContent = "Status";
            const switchBtn = document.createElement("button");
            switchBtn.type = "button"; switchBtn.style.border = "0"; switchBtn.style.padding = "8px 10px"; switchBtn.style.borderRadius = "6px"; switchBtn.style.cursor = "pointer"; switchBtn.style.fontSize = "12px";
            let enabledState = Boolean(selected.enabled);
            const updateSwitch = () => {
              switchBtn.textContent = enabledState ? "ON" : "OFF";
              setHover(switchBtn, enabledState ? "#16a34a" : "#334155", enabledState ? "#15803d" : "#1e293b", "#fff", "#fff");
            };
            updateSwitch();
            switchBtn.onclick = () => { enabledState = !enabledState; updateSwitch(); };
            switchWrap.appendChild(switchLabel); switchWrap.appendChild(switchBtn);
            formRow.appendChild(domainWrap); formRow.appendChild(runAtWrap); formRow.appendChild(switchWrap); right.appendChild(formRow);
            const area = document.createElement("textarea");
            area.value = selected.source || ""; area.style.flex = "1"; area.style.minHeight = "360px"; area.style.border = "1px solid #cbd5e1"; area.style.borderRadius = "6px"; area.style.padding = "8px"; area.style.fontSize = "12px";
            right.appendChild(area);
            const actions = document.createElement("div");
            actions.style.display = "flex"; actions.style.justifyContent = "space-between";
            const del = document.createElement("button");
            del.innerHTML = icon.trash + "<span>Delete</span>"; applyButtonBase(del);
            del.style.border = "0"; del.style.background = "#fee2e2"; del.style.color = "#b91c1c"; del.style.padding = "6px 10px"; del.style.borderRadius = "6px"; del.style.cursor = "pointer";
            setHover(del, "#fee2e2", "#fecaca", "#b91c1c", "#991b1b");
            del.onclick = () => { items = items.filter((item) => item.id !== selected.id); selectedId = items[0] ? items[0].id : null; renderList(); renderForm(); };
            const rightActions = document.createElement("div");
            rightActions.style.display = "flex"; rightActions.style.gap = "8px";
            const cancel = document.createElement("button");
            cancel.innerHTML = icon.x + "<span>Cancel</span>"; applyButtonBase(cancel);
            cancel.style.border = "0"; cancel.style.background = "#cbd5e1"; cancel.style.padding = "6px 10px"; cancel.style.borderRadius = "6px"; cancel.style.cursor = "pointer";
            setHover(cancel, "#cbd5e1", "#94a3b8");
            cancel.onclick = () => close(null);
            const apply = document.createElement("button");
            apply.innerHTML = icon.check + "<span>Apply</span>"; applyButtonBase(apply);
            apply.style.border = "0"; apply.style.background = "#4f46e5"; apply.style.color = "#fff"; apply.style.padding = "6px 10px"; apply.style.borderRadius = "6px"; apply.style.cursor = "pointer";
            setHover(apply, "#4f46e5", "#4338ca", "#fff", "#fff");
            apply.onclick = () => {
              selected.enabled = enabledState; selected.domain = domainInput.value.trim() || "*://*/*"; selected.runAt = runAtSelect.value || "document-end";
              const parsed = parseMeta(area.value); selected.name = parsed.name || selected.name || "Unnamed Script";
              selected.source = withMeta(area.value, { name: selected.name, match: selected.domain, runAt: selected.runAt }); area.value = selected.source; renderList();
            };
            const done = document.createElement("button");
            done.innerHTML = icon.disk + "<span>Done</span>"; applyButtonBase(done);
            done.style.border = "0"; done.style.background = "#0f172a"; done.style.color = "#fff"; done.style.padding = "6px 10px"; done.style.borderRadius = "6px"; done.style.cursor = "pointer";
            setHover(done, "#0f172a", "#1e293b", "#fff", "#fff");
            done.onclick = () => {
              selected.enabled = enabledState; selected.domain = domainInput.value.trim() || "*://*/*"; selected.runAt = runAtSelect.value || "document-end";
              const parsed = parseMeta(area.value); selected.name = parsed.name || selected.name || "Unnamed Script";
              selected.source = withMeta(area.value, { name: selected.name, match: selected.domain, runAt: selected.runAt }); close(items);
            };
            rightActions.appendChild(cancel); rightActions.appendChild(apply); rightActions.appendChild(done);
            actions.appendChild(del); actions.appendChild(rightActions); right.appendChild(actions);
          };
          panel.appendChild(left); panel.appendChild(right); root.appendChild(panel); document.documentElement.appendChild(root); renderList(); renderForm();
        });
      })();`,
        true,
      );
      return result as any[];
    } catch (error) {
      console.log("UserScriptDialogController error", error);
      return false;
    }
  }
}
