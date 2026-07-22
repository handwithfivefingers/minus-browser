export const CAPTURE_CREDENTIAL_SCRIPT = `(() => {
          if (window.__minusSelectionCaptureMounted) return null;
          window.__minusSelectionCaptureMounted = true;
          const pwdInput = document.querySelector('input[type="password"]');
          if (!pwdInput) return null;
          const password = pwdInput.value;
          if (!password) return null;
          const usernameSelectors = [
            'input[type="email"]',
            'input[name*="user" i]', 'input[name*="email" i]',
            'input[id*="user" i]', 'input[id*="email" i]',
            'input:not([type="password"])'
          ];
          const userInput = usernameSelectors
            .map(function(s) { return document.querySelector(s); })
            .find(function(el) { return Boolean(el); });
          const username = userInput ? userInput.value : '';
          return {
            username: username,
            password: password,
            url: window.location.href
          };
        })();`
