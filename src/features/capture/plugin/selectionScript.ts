export const CAPTURE_SELECTION_SCRIPT = `
(function() {
  const trustPolicy = window.trustedTypes && window.trustedTypes.createPolicy && window.trustedTypes.createPolicy("forceInner", {
    createHTML: function(to_escape) { return to_escape; },
  });

  if (document.getElementById("__minus_capture_overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "__minus_capture_overlay";
  overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;cursor:crosshair;";

  const backdrop = document.createElement("div");
  backdrop.style.cssText = "position:absolute;inset:0;background:rgba(0,0,0,0.3);pointer-events:none;";

  const selection = document.createElement("div");
  selection.style.cssText = "position:absolute;border:2px solid #4f46e5;background:rgba(79,70,229,0.1);display:none;pointer-events:none;";

  const instruction = document.createElement("div");
  instruction.textContent = "Drag to select a region. Press Esc to cancel.";
  instruction.style.cssText = "position:absolute;bottom:20px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:8px 16px;border-radius:8px;font:12px sans-serif;z-index:1;";

  overlay.appendChild(backdrop);
  overlay.appendChild(selection);
  overlay.appendChild(instruction);
  document.documentElement.appendChild(overlay);

  let startX = 0, startY = 0, drawing = false;

  overlay.addEventListener("mousedown", (e) => {
    drawing = true;
    startX = e.clientX;
    startY = e.clientY;
    selection.style.cssText += "left:" + startX + "px;top:" + startY + "px;width:0;height:0;display:block;";
  });

  overlay.addEventListener("mousemove", (e) => {
    if (!drawing) return;
    const x = Math.min(startX, e.clientX);
    const y = Math.min(startY, e.clientY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);
    selection.style.left = x + "px";
    selection.style.top = y + "px";
    selection.style.width = w + "px";
    selection.style.height = h + "px";
  });

  overlay.addEventListener("mouseup", (e) => {
    if (!drawing) return;
    drawing = false;
    const x = Math.min(startX, e.clientX);
    const y = Math.min(startY, e.clientY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);
    overlay.remove();
    console.log("__MINUS_CAPTURE_SELECTION__:" + JSON.stringify({ x, y, w, h }));
  });

  document.addEventListener("keydown", function onEsc(e) {
    if (e.key === "Escape") {
      overlay.remove();
      document.removeEventListener("keydown", onEsc);
    }
  });
})();
`
