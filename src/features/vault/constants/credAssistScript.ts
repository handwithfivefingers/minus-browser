export const CREDENTIAL_ASSIST_SCRIPT = `(function() {
          if (window.__minusCredentialAssistMounted) return;
          window.__minusCredentialAssistMounted = true;
          window.__minusCredentialAssistFocused = false;
          const ICON_ID = "__minus_credential_assist_icon";

          const ensureIcon = () => {
            let icon = document.getElementById(ICON_ID);
            if (icon) return icon;
            icon = document.createElement("img");
            icon.id = ICON_ID;
            icon.type = "button";
            icon.setAttribute("aria-label", "Credential assist");
            icon.style.position = "fixed";
            icon.style.zIndex = "2147483646";
            icon.style.width = "24px";
            icon.style.height = "24px";
            icon.style.display = "none";
            icon.style.alignItems = "center";
            icon.style.justifyContent = "center";
            icon.style.border = "0";
            icon.style.borderRadius = "4px";
            icon.style.background = "#fff";
            icon.style.color = "#fff";
            icon.style.boxShadow = "0 6px 18px rgba(15, 23, 42, .26)";
            icon.style.cursor = "pointer";
            icon.style.padding = "0.125rem";
            icon.style.fontSize = "13px";
            icon.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJpY29uIGljb24tdGFibGVyIGljb25zLXRhYmxlci1vdXRsaW5lIGljb24tdGFibGVyLWtleSI+PHBhdGggc3Ryb2tlPSJub25lIiBkPSJNMCAwaDI0djI0SDB6IiBmaWxsPSJub25lIiAvPjxwYXRoIGQ9Ik0xNi41NTUgMy44NDNsMy42MDIgMy42MDJhMi44NzcgMi44NzcgMCAwIDEgMCA0LjA2OWwtMi42NDMgMi42NDNhMi44NzcgMi44NzcgMCAwIDEgLTQuMDY5IDBsLS4zMDEgLS4zMDFsLTYuNTU4IDYuNTU4YTIgMiAwIDAgMSAtMS4yMzkgLjU3OGwtLjE3NSAuMDA4aC0xLjE3MmExIDEgMCAwIDEgLS45OTMgLS44ODNsLS4wMDcgLS4xMTd2LTEuMTcyYTIgMiAwIDAgMSAuNDY3IC0xLjI4NGwuMTE5IC0uMTNsLjQxNCAtLjQxNGgydi0yaDJ2LTJsMi4xNDQgLTIuMTQ0bC0uMzAxIC0uMzAxYTIuODc3IDIuODc3IDAgMCAxIDAgLTQuMDY5bDIuNjQzIC0yLjY0M2EyLjg3NyAyLjg3NyAwIDAgMSA0LjA2OSAwIiAvPjxwYXRoIGQ9Ik0xNSA5aC4wMSIgLz48L3N2Zz4='
            icon.title = "Credential assist: use Vault button on browser header";
            icon.addEventListener("mouseenter", () => { icon.style.background = "#ccc"; });
            icon.addEventListener("mouseleave", () => { icon.style.background = "#fff"; });
            icon.addEventListener("mousedown", (event) => {
              // Keep current input focus so focusout handler does not hide icon.
              event.preventDefault();
              event.stopPropagation();
            });
            icon.addEventListener("click", () => {
              console.log("__MINUS_FILL_PASSWORD_REQUEST__");
            });
            document.documentElement.appendChild(icon);
            return icon;
          };

          const wrapper = document.createElement("div")
          wrapper.id = 'minusInlineSuggestion'
          const shadowRoot = wrapper.attachShadow({ mode: "open" });
          const icon = ensureIcon()
          shadowRoot.appendChild(icon);


          const isTargetInput = (el) => {
            if (!el || el.tagName !== "INPUT") return false;
            const type = String(el.getAttribute("type") || "text").toLowerCase();
            const name = String(el.getAttribute("name") || "").toLowerCase();
            const id = String(el.getAttribute("id") || "").toLowerCase();
            const placeholder = String(el.getAttribute("placeholder") || "").toLowerCase();
            const className = String(el.getAttribute("class") || "").toLowerCase();
            const joined = [type, name, id, placeholder, className].join(" ");
            return (
              joined.includes("email") ||
              joined.includes("user") ||
              joined.includes("name") ||
              joined.includes("pass") ||
              joined.includes("pwd") ||
              joined.includes("login") ||
              joined.includes("signin") ||
              joined.includes("sign-in") ||
              joined.includes("account") ||
              type === "password"
            );
          };



          const hideIcon = () => {
            // const icon = document.getElementById(ICON_ID);
            if (icon) icon.style.display = "none";
          };

          const moveIcon = (target) => {
            if (!target) {
              icon.style.display = "none";
              return;
            }
            const rect = target.getBoundingClientRect();
            const top = Math.max(8, rect.top + (rect.height - 24) / 2);
            const left = Math.min(window.innerWidth - 32, rect.right + 8);
            icon.style.top = top + "px";
            icon.style.left = left + "px";
            icon.style.display = "inline-flex";
          };

          document.addEventListener("focusin", (event) => {
            const target = event.target;
            if (!isTargetInput(target)) {
              hideIcon();
              window.__minusCredentialAssistTarget = null;
              return;
            }
            window.__minusCredentialAssistTarget = target;
            window.__minusCredentialAssistFocused = true;
            moveIcon(target);
          }, true);

          document.addEventListener("focusout", () => {
            const wasFocused = window.__minusCredentialAssistFocused;
            window.__minusCredentialAssistFocused = false;
            setTimeout(() => {
              const active = document.activeElement;
              if (!isTargetInput(active)) {
                if (wasFocused) return;
                hideIcon();
                window.__minusCredentialAssistTarget = null;
              }
            }, 60);
          }, true);

          window.addEventListener("scroll", () => {
            const target = window.__minusCredentialAssistTarget;
            if (target && isTargetInput(target)) moveIcon(target);
          }, true);

          window.addEventListener("resize", () => {
            const target = window.__minusCredentialAssistTarget;
            if (target && isTargetInput(target)) moveIcon(target);
          });
          document.body.appendChild(wrapper)
        })();`;
