export const CAPTURE_CREDENTIAL_SCRIPT = `(() => {
          if (window.__minusSelectionCaptureMounted) return;
          window.__minusSelectionCaptureMounted = true;
          if (!window.__minusSelectionAnchor) {
            window.__minusSelectionAnchor = null;
          }
          document.addEventListener("mousemove", (event) => {
            window.__minusSelectionAnchor = { x: event.clientX, y: event.clientY };
          }, true);
          const notify = () => {
            const text = String(window.getSelection?.()?.toString?.() || "").trim().slice(0, 4000);
            if (!text) return;
            try {
              const selection = window.getSelection?.();
              const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
              if (range) {
                const rect = range.getBoundingClientRect();
                window.__minusSelectionAnchor = { x: rect.left, y: rect.bottom };
              }
            } catch (error) {}
            console.log("__MINUS_SELECTION_CAPTURE__:" + JSON.stringify({
              text,
              url: window.location.href,
              anchor: window.__minusSelectionAnchor || null
            }));
          };
          document.addEventListener("selectionchange", () => {
            clearTimeout(window.__minusSelectionCaptureTimer);
            window.__minusSelectionCaptureTimer = setTimeout(notify, 120);
          });
        })();`;
