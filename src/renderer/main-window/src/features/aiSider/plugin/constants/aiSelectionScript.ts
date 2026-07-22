export const AI_SELECTION_SCRIPT = `(() => {
  const trustPolicy = window.trustedTypes?.createPolicy(
    "forceInner",
    {
      createHTML: (to_escape) => to_escape,
    },
  );

  if (window.__minusAiSelectionMounted) return;
  window.__minusAiSelectionMounted = true;

  const CONTAINER_ID = "__minus_ai_container";
  let selectedText = "";
  let hideTimeout = null;
  let isHovering = false;

  const ACTIONS = [
    { id: "chat", label: "Chat", icon: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' },
    { id: "summarize", label: "Summary", icon: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' },
    { id: "explain", label: "Explain", icon: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' },
  ];

  const fire = (action) => {
    const text = selectedText;
    if (text) {
      console.log("__MINUS_AI_SELECTION__:" + JSON.stringify({ text, action, url: window.location.href }));
    }
    hideContainer();
  };

  const createUI = () => {
    if (document.getElementById(CONTAINER_ID)) return;

    // Main floating button
    const btn = document.createElement("button");
    btn.id = CONTAINER_ID;
    btn.textContent = "AI";
    Object.assign(btn.style, {
      position: "fixed",
      zIndex: "2147483647",
      display: "none",
      width: "28px",
      height: "28px",
      border: "0",
      borderRadius: "50%",
      background: "#6366f1",
      color: "#fff",
      cursor: "pointer",
      fontSize: "10px",
      fontWeight: "700",
      fontFamily: "system-ui, -apple-system, sans-serif",
      letterSpacing: "0.3px",
      boxShadow: "0 3px 12px rgba(99,102,241,.4)",
      transition: "transform .2s cubic-bezier(.34,1.56,.64,1), background .15s",
    });

    // Tooltip popover
    const tip = document.createElement("div");
    Object.assign(tip.style, {
      position: "absolute",
      bottom: "calc(100% + 6px)",
      left: "50%",
      transform: "translateX(-50%)",
      display: "none",
      background: "#fff",
      borderRadius: "8px",
      padding: "3px",
      boxShadow: "0 6px 20px rgba(15,23,42,.14), 0 2px 6px rgba(15,23,42,.06)",
      border: "1px solid #e2e8f0",
      whiteSpace: "nowrap",
      gap: "2px",
    });

    // Arrow connecting tooltip to button
    const arrow = document.createElement("div");
    Object.assign(arrow.style, {
      position: "absolute",
      top: "100%",
      left: "50%",
      transform: "translateX(-50%)",
      width: "0",
      height: "0",
      borderLeft: "5px solid transparent",
      borderRight: "5px solid transparent",
      borderTop: "5px solid #fff",
      filter: "drop-shadow(0 1px 1px rgba(15,23,42,.06))",
    });

    ACTIONS.forEach((action) => {
      const chip = document.createElement("button");
      chip.innerHTML = trustPolicy.createHTML(action.icon + '<span style="margin-left:4px">' + action.label + "</span>");
      Object.assign(chip.style, {
        display: "inline-flex",
        alignItems: "center",
        border: "0",
        borderRadius: "6px",
        background: "transparent",
        color: "#334155",
        cursor: "pointer",
        fontSize: "10px",
        fontWeight: "500",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "3px 8px",
        transition: "background .12s",
      });
      chip.addEventListener("mouseenter", () => { chip.style.background = "#f1f5f9"; });
      chip.addEventListener("mouseleave", () => { chip.style.background = "transparent"; });
      chip.addEventListener("mousedown", (e) => { e.preventDefault(); e.stopPropagation(); });
      chip.addEventListener("click", () => fire(action.id));
      tip.appendChild(chip);
    });

    btn.appendChild(tip);
    btn.appendChild(arrow);

    // Tooltip visibility on hover
    const showTip = () => { tip.style.display = "flex"; };
    const hideTip = () => { tip.style.display = "none"; };

    btn.addEventListener("mouseenter", () => {
      isHovering = true;
      clearTimeout(hideTimeout);
      btn.style.background = "#4f46e5";
      btn.style.transform = "scale(1.12)";
      showTip();
    });

    const onBtnLeave = () => {
      btn.style.background = "#6366f1";
      btn.style.transform = "scale(1)";
      hideTimeout = setTimeout(() => {
        if (!isHovering) {
          hideTip();
          hideContainer();
        }
        isHovering = false;
      }, 180);
    };
    btn.addEventListener("mouseleave", onBtnLeave);

    tip.addEventListener("mouseenter", () => {
      isHovering = true;
      clearTimeout(hideTimeout);
    });
    tip.addEventListener("mouseleave", () => {
      isHovering = false;
      hideTip();
    });

    btn.addEventListener("mousedown", (e) => { e.preventDefault(); e.stopPropagation(); });
    btn.addEventListener("click", (e) => { e.stopPropagation(); });
    btn.addEventListener("mouseup", (e) => { e.stopPropagation(); });

    document.documentElement.appendChild(btn);
  };

  const showContainer = (x, y) => {
    const btn = document.getElementById(CONTAINER_ID);
    if (!btn) return;
    btn.style.left = Math.min(x + 6, window.innerWidth - 42) + "px";
    btn.style.top = Math.max(8, y - 38) + "px";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
  };

  const hideContainer = () => {
    const btn = document.getElementById(CONTAINER_ID);
    if (!btn) return;
    btn.style.display = "none";
    const tip = btn.children[0];
    if (tip) tip.style.display = "none";
  };

  createUI();

  document.addEventListener("selectionchange", () => {
    clearTimeout(hideTimeout);
    const text = String(window.getSelection?.()?.toString?.() || "").trim().slice(0, 4000);
    if (!text) {
      hideTimeout = setTimeout(() => {
        if (!isHovering) hideContainer();
      }, 250);
      return;
    }
    selectedText = text;
    try {
      const sel = window.getSelection();
      const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
      if (range) {
        const rect = range.getBoundingClientRect();
        showContainer(rect.right, rect.top);
      }
    } catch (e) {
      showContainer(window.innerWidth / 2, window.innerHeight / 2);
    }
  });

  document.addEventListener("mousedown", (e) => {
    const btn = document.getElementById(CONTAINER_ID);
    if (btn && btn !== e.target && !btn.contains(e.target)) {
      const currentText = String(window.getSelection?.()?.toString?.() || "").trim();
      if (!currentText) {
        hideTimeout = setTimeout(() => {
          if (!isHovering) hideContainer();
        }, 180);
      }
    }
  });

  document.addEventListener("scroll", () => {
    const text = String(window.getSelection?.()?.toString?.() || "").trim();
    if (!text && !isHovering) hideContainer();
  }, true);
})();`
