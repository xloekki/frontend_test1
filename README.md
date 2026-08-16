# VIEWER//09 Frontend

Static GitHub Pages frontend.

## Required setup

Edit `config.js`:

`window.BACKEND_URL = "https://YOUR-BACKEND.onrender.com";`

## Included UI

- persistent tabs
- back / forward / reload / home
- address + search bar
- bookmarks
- history
- recently closed tabs
- dark/light mode
- quick links
- backend status
- control panel
- domain tester
- page inspector
- performance metrics
- command palette
- find-in-page bridge
- zoom controls
- keyboard shortcuts

## Shortcuts

- Ctrl/Cmd + L → address bar
- Ctrl/Cmd + T → new tab
- Ctrl/Cmd + Shift + T → reopen closed tab
- Ctrl/Cmd + W → close tab
- Ctrl/Cmd + R → reload
- Ctrl/Cmd + K → command palette
- Ctrl/Cmd + F → find in page
- Ctrl/Cmd + +/-/0 → zoom
- Alt + Left/Right → back/forward


## Google-style address bar routing

The address bar now behaves like a normal browser:

- `wikipedia.org` → opens `https://wikipedia.org`
- `github.com/openai` → opens that URL
- `cats` → Google search
- `how do black holes work` → Google search
- `6039535100162348415` → Google search
- `roblox studio scripting` → Google search

Anything that does not clearly match a web address is sent to the configured Google Search URL.
