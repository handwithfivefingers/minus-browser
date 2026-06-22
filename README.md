# MinusBrowser

A lightweight, cross-platform web browser built with Electron, React, TypeScript, and Vite. MinusBrowser combines modern browser essentials with developer-friendly features.

## Features

- **Tab Management** — Full multi-tab browsing with session restore and tab lifecycle management
- **Ad Blocker** — Built-in ad and tracker blocking powered by Ghostery's adblocker engine
- **Search** — Customizable search with multiple providers and quick switching
- **Spotlight** — macOS-style command palette for quick navigation and actions
- **Bookmarks & History** — Full bookmark manager and browsing history with search
- **In-Page Translation** — Translate web pages into your language on the fly
- **Find in Page** — Fast text search within pages (findbar)
- **User Scripts** — Run custom user scripts to extend page functionality
- **Vault** — Secure local storage for sensitive data
- **Password Manager** — Save, autofill, and manage website credentials
- **Cache System** — Efficient resource caching for faster page loads
- **Commands & Context Menu** — Extensible command system with contextual actions
- **Customizable UI** — React-based interface styled with Tailwind CSS

## Tech Stack

- **Framework:** Electron + Vite
- **UI:** React 19, React Router, Tailwind CSS 4
- **State:** Zustand
- **Language:** TypeScript
- **Ad Blocking:** @ghostery/adblocker
- **Icons:** @tabler/icons-react

## Getting Started

```bash
# Install dependencies
npm install

# Start development
npm start

# Build for macOS
npm run build:mac

# Build for Windows
npm run build:win
```
