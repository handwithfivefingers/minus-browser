export class VaultDialogController {
  async selectCredential(
    webContents: Electron.WebContents,
    candidates: { id: string; username: string; site: string }[],
  ) {
    const script = `(() => {
      const payload = ${JSON.stringify(candidates)};
      return new Promise((resolve) => {
        const old = document.getElementById("__minus_vault_picker");
        if (old) old.remove();
        const root = document.createElement("div");
        root.id = "__minus_vault_picker";
        root.style.position = "fixed";
        root.style.inset = "0";
        root.style.zIndex = "2147483647";
        root.style.background = "rgba(0,0,0,0.45)";
        root.style.display = "flex";
        root.style.alignItems = "center";
        root.style.justifyContent = "center";
        const panel = document.createElement("div");
        panel.style.width = "420px";
        panel.style.maxWidth = "92vw";
        panel.style.maxHeight = "70vh";
        panel.style.overflow = "auto";
        panel.style.background = "#fff";
        panel.style.borderRadius = "10px";
        panel.style.padding = "12px";
        panel.style.position = "relative";
        panel.style.fontFamily = "sans-serif";
        panel.style.color = "#0f172a";
        panel.innerHTML = '<div style="font-weight:600;margin-bottom:8px;">Choose Credential</div>';
        const close = (value) => {
          root.remove();
          document.removeEventListener("keydown", onKeyDown);
          resolve(value);
        };
        const onKeyDown = (event) => { if (event.key === "Escape") close(null); };
        document.addEventListener("keydown", onKeyDown);
        root.addEventListener("click", () => close(null));
        panel.addEventListener("click", (event) => event.stopPropagation());
        const closeBtn = document.createElement("button");
        closeBtn.textContent = "×";
        closeBtn.style.position = "absolute";
        closeBtn.style.top = "8px";
        closeBtn.style.right = "8px";
        closeBtn.style.border = "0";
        closeBtn.style.background = "transparent";
        closeBtn.style.fontSize = "18px";
        closeBtn.style.cursor = "pointer";
        closeBtn.onclick = () => close(null);
        panel.appendChild(closeBtn);
        payload.forEach((item) => {
          const btn = document.createElement("button");
          btn.textContent = item.username + " @ " + item.site;
          btn.style.width = "100%";
          btn.style.textAlign = "left";
          btn.style.padding = "8px";
          btn.style.marginBottom = "6px";
          btn.style.border = "0";
          btn.style.borderRadius = "6px";
          btn.style.background = "#f1f5f9";
          btn.style.cursor = "pointer";
          btn.onclick = () => close(item.id);
          panel.appendChild(btn);
        });
        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.justifyContent = "flex-end";
        actions.style.marginTop = "8px";
        const cancel = document.createElement("button");
        cancel.textContent = "Cancel";
        cancel.style.padding = "6px 10px";
        cancel.style.border = "0";
        cancel.style.borderRadius = "6px";
        cancel.style.background = "#cbd5e1";
        cancel.style.cursor = "pointer";
        cancel.onclick = () => close(null);
        actions.appendChild(cancel);
        panel.appendChild(actions);
        root.appendChild(panel);
        document.documentElement.appendChild(root);
      });
    })();`;
    return webContents.executeJavaScript(script, true);
  }

  async confirmSave(
    webContents: Electron.WebContents,
    data: { username: string; site: string },
  ) {
    const script = `(() => {
      const username = ${JSON.stringify(data.username || "this account")};
      const site = ${JSON.stringify(data.site || "this site")};
      return new Promise((resolve) => {
        const old = document.getElementById("__minus_vault_save_confirm");
        if (old) old.remove();
        const root = document.createElement("div");
        root.id = "__minus_vault_save_confirm";
        root.style.position = "fixed";
        root.style.inset = "0";
        root.style.zIndex = "2147483647";
        root.style.background = "rgba(0,0,0,0.45)";
        root.style.display = "flex";
        root.style.alignItems = "center";
        root.style.justifyContent = "center";
        const panel = document.createElement("div");
        panel.style.width = "420px";
        panel.style.maxWidth = "92vw";
        panel.style.background = "#fff";
        panel.style.borderRadius = "10px";
        panel.style.padding = "12px";
        panel.style.position = "relative";
        panel.style.fontFamily = "sans-serif";
        panel.style.color = "#0f172a";
        const close = (value) => {
          root.remove();
          document.removeEventListener("keydown", onKeyDown);
          resolve(value);
        };
        const onKeyDown = (event) => { if (event.key === "Escape") close(false); };
        document.addEventListener("keydown", onKeyDown);
        root.addEventListener("click", () => close(false));
        panel.addEventListener("click", (event) => event.stopPropagation());
        const closeBtn = document.createElement("button");
        closeBtn.textContent = "×";
        closeBtn.style.position = "absolute";
        closeBtn.style.top = "8px";
        closeBtn.style.right = "8px";
        closeBtn.style.border = "0";
        closeBtn.style.background = "transparent";
        closeBtn.style.fontSize = "18px";
        closeBtn.style.cursor = "pointer";
        closeBtn.onclick = () => close(false);
        panel.innerHTML = '<div style="font-weight:600;margin-bottom:8px;">Save Credential?</div>' +
          '<div style="font-size:13px;margin-bottom:12px;">Save credential for <b>' + username + '</b> on <b>' + site + "</b>?</div>";
        panel.appendChild(closeBtn);
        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.justifyContent = "flex-end";
        actions.style.gap = "8px";
        const ignore = document.createElement("button");
        ignore.textContent = "Ignore";
        ignore.style.padding = "6px 10px";
        ignore.style.border = "0";
        ignore.style.borderRadius = "6px";
        ignore.style.background = "#cbd5e1";
        ignore.style.cursor = "pointer";
        ignore.onclick = () => close(false);
        const save = document.createElement("button");
        save.textContent = "Save";
        save.style.padding = "6px 10px";
        save.style.border = "0";
        save.style.borderRadius = "6px";
        save.style.background = "#4f46e5";
        save.style.color = "#fff";
        save.style.cursor = "pointer";
        save.onclick = () => close(true);
        actions.appendChild(ignore);
        actions.appendChild(save);
        panel.appendChild(actions);
        root.appendChild(panel);
        document.documentElement.appendChild(root);
      });
    })();`;
    return webContents.executeJavaScript(script, true);
  }

  async openManager(webContents: Electron.WebContents, vaultItems: any[]) {
    return webContents.executeJavaScript(
      `(() => {
        const input = ${JSON.stringify(vaultItems)};
        return new Promise((resolve) => {
          const rootId = "__minus_vault_manager";
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
          panel.style.width = "860px";
          panel.style.maxWidth = "94vw";
          panel.style.height = "70vh";
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
          const onKeyDown = (event) => { if (event.key === "Escape") close(null); };
          document.addEventListener("keydown", onKeyDown);
          root.addEventListener("click", () => close(null));
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
          closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "#cbd5e1"; closeBtn.style.color = "#0f172a"; });
          closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = "#e2e8f0"; closeBtn.style.color = "#334155"; });
          closeBtn.onclick = () => close(null);
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
          const getSelected = () => items.find((item) => item.id === selectedId);
          const uid = () => "new-" + Math.random().toString(36).slice(2);
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
          const renderList = () => {
            left.innerHTML = "";
            const title = document.createElement("div");
            title.textContent = "Password Vault";
            title.style.fontWeight = "600";
            title.style.marginBottom = "8px";
            left.appendChild(title);
            const addBtn = document.createElement("button");
            addBtn.innerHTML = icon.plus + "<span>New</span>";
            applyButtonBase(addBtn);
            addBtn.style.border = "0"; addBtn.style.background = "#4f46e5"; addBtn.style.color = "#fff";
            addBtn.style.padding = "6px 10px"; addBtn.style.borderRadius = "6px"; addBtn.style.cursor = "pointer"; addBtn.style.marginBottom = "8px";
            setHover(addBtn, "#4f46e5", "#4338ca", "#fff", "#fff");
            addBtn.onclick = () => {
              const item = { id: uid(), site: "", username: "", password: "", notes: "" };
              items.unshift(item); selectedId = item.id; renderList(); renderForm();
            };
            left.appendChild(addBtn);
            items.forEach((item) => {
              const btn = document.createElement("button");
              btn.innerHTML =
                '<div style="font-weight:500;">Domain: ' +
                (item.site || "new site") +
                "</div>" +
                '<div style="font-weight:300;color:rgba(0,0,0,.8);margin-top:2px;">' +
                (item.username || "unknown") +
                "</div>";
              btn.style.display = "block"; btn.style.width = "100%"; btn.style.textAlign = "left"; btn.style.marginBottom = "6px";
              btn.style.border = "0"; btn.style.padding = "8px"; btn.style.borderRadius = "6px"; btn.style.cursor = "pointer";
              btn.style.background = selectedId === item.id ? "#e0e7ff" : "#f1f5f9";
              btn.onclick = () => { selectedId = item.id; renderList(); renderForm(); };
              left.appendChild(btn);
            });
          };
          const renderForm = () => {
            right.innerHTML = "";
            const selected = getSelected();
            const title = document.createElement("div");
            title.textContent = "Edit Credential";
            title.style.fontWeight = "600";
            right.appendChild(title);
            if (!selected) return;
            const mkInput = (labelText, value, type = "text") => {
              const wrap = document.createElement("label");
              wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.gap = "4px"; wrap.style.fontSize = "12px";
              const label = document.createElement("span"); label.textContent = labelText;
              const input = document.createElement("input"); input.type = type; input.value = value || "";
              input.style.border = "1px solid #cbd5e1"; input.style.padding = "7px"; input.style.borderRadius = "6px"; input.style.fontSize = "12px";
              wrap.appendChild(label); wrap.appendChild(input); return { wrap, input };
            };
            const mkArea = (labelText, value) => {
              const wrap = document.createElement("label");
              wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.gap = "4px"; wrap.style.fontSize = "12px";
              const label = document.createElement("span"); label.textContent = labelText;
              const area = document.createElement("textarea"); area.value = value || "";
              area.style.border = "1px solid #cbd5e1"; area.style.padding = "7px"; area.style.borderRadius = "6px"; area.style.minHeight = "86px"; area.style.fontSize = "12px";
              wrap.appendChild(label); wrap.appendChild(area); return { wrap, area };
            };
            const site = mkInput("Site", selected.site);
            const username = mkInput("Username", selected.username);
            const password = mkInput("Password", selected.password, "password");
            const notes = mkArea("Notes", selected.notes || "");
            right.appendChild(site.wrap); right.appendChild(username.wrap); right.appendChild(password.wrap); right.appendChild(notes.wrap);
            const actions = document.createElement("div");
            actions.style.display = "flex"; actions.style.justifyContent = "space-between"; actions.style.marginTop = "auto";
            const leftAction = document.createElement("button");
            leftAction.innerHTML = icon.trash + "<span>Delete</span>";
            applyButtonBase(leftAction);
            leftAction.style.border = "0"; leftAction.style.background = "#fee2e2"; leftAction.style.color = "#b91c1c";
            leftAction.style.padding = "6px 10px"; leftAction.style.borderRadius = "6px"; leftAction.style.cursor = "pointer";
            setHover(leftAction, "#fee2e2", "#fecaca", "#b91c1c", "#991b1b");
            leftAction.onclick = () => { items = items.filter((item) => item.id !== selected.id); selectedId = items[0] ? items[0].id : null; renderList(); renderForm(); };
            const rightActions = document.createElement("div");
            rightActions.style.display = "flex"; rightActions.style.gap = "8px";
            const apply = document.createElement("button");
            apply.innerHTML = icon.check + "<span>Apply</span>";
            applyButtonBase(apply);
            apply.style.border = "0"; apply.style.background = "#4f46e5"; apply.style.color = "#fff"; apply.style.padding = "6px 10px"; apply.style.borderRadius = "6px"; apply.style.cursor = "pointer";
            setHover(apply, "#4f46e5", "#4338ca", "#fff", "#fff");
            apply.onclick = () => { selected.site = site.input.value.trim(); selected.username = username.input.value.trim(); selected.password = password.input.value; selected.notes = notes.area.value; renderList(); };
            const done = document.createElement("button");
            done.innerHTML = icon.disk + "<span>Done</span>";
            applyButtonBase(done);
            done.style.border = "0"; done.style.background = "#0f172a"; done.style.color = "#fff"; done.style.padding = "6px 10px"; done.style.borderRadius = "6px"; done.style.cursor = "pointer";
            setHover(done, "#0f172a", "#1e293b", "#fff", "#fff");
            done.onclick = () => close(items);
            const cancel = document.createElement("button");
            cancel.innerHTML = icon.x + "<span>Cancel</span>";
            applyButtonBase(cancel);
            cancel.style.border = "0"; cancel.style.background = "#cbd5e1"; cancel.style.padding = "6px 10px"; cancel.style.borderRadius = "6px"; cancel.style.cursor = "pointer";
            setHover(cancel, "#cbd5e1", "#94a3b8");
            cancel.onclick = () => close(null);
            rightActions.appendChild(cancel); rightActions.appendChild(apply); rightActions.appendChild(done);
            actions.appendChild(leftAction); actions.appendChild(rightActions); right.appendChild(actions);
          };
          panel.appendChild(left); panel.appendChild(right); root.appendChild(panel); document.documentElement.appendChild(root); renderList(); renderForm();
        });
      })();`,
      true,
    );
  }
}
