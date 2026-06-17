# AI Sidebar — Implementation Plan

## Overview
Add a **collapsible AI-powered sidebar** to MinusBrowser (similar to the Sider Chrome extension) with features: **Summarize**, **Generate**, **Chat**, **Explain**, and other AI helpers. The sidebar appears on the **right side** of the browser window, alongside the existing left sidebar.

---

## 1. Architecture Decisions

- **Sidebar Type**: New right-side panel (separate from the existing left `SideMenu` which handles tabs/navigation).
- **Rendering approach**: Inline React component rendered within the main renderer process (like `SideMenu`), using the same React + Tailwind stack — no separate `WebContentsView` needed. This keeps IPC simple and avoids the complexity of an overlay renderer.
- **AI Provider**: Use the existing `openai` SDK with the `GROQ_AI_API_KEY` from `.env`. Groq provides OpenAI-compatible API endpoints (fast LLM inference). Alternatively, support multiple AI providers (Groq, OpenAI, Anthropic) via a provider abstraction.
- **State**: New Zustand store (`useAiSidebarStore`) for sidebar open/close, active mode, conversation history, settings.
- **Persistence**: Conversation history and AI preferences saved via the existing `StoreManager` pattern.
- **All code lives under** `src/features/ui/features/aiSider/` — since AI is purely a frontend feature, it lives inside the UI feature tree, not at the top-level `src/features/`.

---

## 2. Features & Modes

| Mode | Description |
|------|-------------|
| **Chat** | Free-form chat with an LLM. Maintains conversation history per session. |
| **Summarize** | Summarize the currently active web page. Extracts page text content and sends to LLM with a summarization prompt. |
| **Generate** | Content generation with predefined templates (email, blog post, social media, code, etc.) or custom prompt. |
| **Explain** | Explain selected text from the page. Uses `window.getSelection()` via IPC or injected script to grab selected text from the active tab. |
| **Quick Actions** | One-click actions: fix grammar, simplify language, translate to target language, change tone. |

---

## 3. Implementation Phases

### Phase 1: Foundation (Right Sidebar Shell)
**Goal**: Render a collapsible right-side panel in the layout, toggled by a button or keyboard shortcut.

**Files to create/modify:**
| File | Change |
|------|--------|
| `src/features/ui/features/aiSider/components/AiSidebar.tsx` | New: Right sidebar container (collapsible, resizable, mode tabs) |
| `src/features/ui/features/aiSider/components/styles.module.css` | New: CSS module for AiSidebar |
| `src/features/ui/features/aiSider/stores/useAiSidebarStore.ts` | New: Zustand store (isOpen, activeMode, width) |
| `src/features/ui/pages/layout.tsx` | Modify: Render `<AiSidebar />` alongside `<SideMenu />` |
| `src/features/ui/components/sidebar/index.tsx` (or header) | Modify: Add toggle button for AI sidebar |
| `src/features/ui/components/index.ts` | Modify: Export AiSidebar |

**Key decisions:**
- Sidebar width: default 380px, resizable (min 300px, max 600px), collapsible to 0.
- Toggle: AI icon button in the header toolbar (next to existing controls) + keyboard shortcut (e.g., `Ctrl+Shift+I`).
- Collapse state: Slide-in/out animation with Tailwind transitions.

---

### Phase 2: AI Service Layer
**Goal**: Create the backend service that communicates with LLM APIs.

**Files to create:**
| File | Change |
|------|--------|
| `src/features/ui/features/aiSider/services/aiProvider.ts` | New: Provider abstraction (OpenAI-compatible). Handles Groq/OpenAI config from env. |
| `src/features/ui/features/aiSider/services/pageReader.ts` | New: Extract page text content from active tab (inject content script or use IPC to get page text). |
| `src/features/ui/features/aiSider/services/promptTemplates.ts` | New: Prompt templates for summarize, explain, grammar fix, tone change, etc. |
| `src/features/ui/features/aiSider/hooks/useAiChat.ts` | New: React hook wrapping AI provider (streaming response, loading state, error handling). |
| `src/shared/constants/ipc.ts` | Modify: Add new IPC channels for AI operations. |
| `src/features/system/controller/viewController.ts` | Modify: Add IPC handlers for page text extraction and AI inference. |

**Key decisions:**
- Use **streaming responses** (SSE-like via OpenAI SDK) for Chat mode.
- Page text extraction: Inject a small content script via `executeJavaScript` that reads `document.body.innerText` and sends it back via IPC.
- Rate limiting: Client-side debounce for rapid requests.

---

### Phase 3: Chat Mode
**Goal**: Full conversational AI in the sidebar.

**Files to create/modify:**
| File | Change |
|------|--------|
| `src/features/ui/features/aiSider/modes/ChatMode.tsx` | New: Chat UI (message list, input box, send button, markdown rendering) |
| `src/features/ui/features/aiSider/components/MessageBubble.tsx` | New: Single message component (user/assistant, markdown, code blocks, copy button) |
| `src/features/ui/features/aiSider/components/ModelSelector.tsx` | New: Dropdown to switch between available models |

**Features:**
- Markdown rendering for assistant responses (use a lightweight library like `react-markdown` or `marked`).
- Code blocks with syntax highlighting and copy button.
- Conversation history displayed in a scrollable list.
- "New Chat" button to clear history.
- Persist last N conversations to disk.

---

### Phase 4: Summarize Mode
**Goal**: One-click page summarization.

**Files to create/modify:**
| File | Change |
|------|--------|
| `src/features/ui/features/aiSider/modes/SummaryMode.tsx` | New: Summarize UI (summary display, copy, regenerate) |
| `src/features/ui/features/aiSider/services/summarizer.ts` | New: Orchestrates page text extraction + LLM summarization |

**Flow:**
1. User clicks "Summarize" button.
2. Sidebar extracts page content via `pageReader.ts`.
3. Sends content + summary prompt to LLM.
4. Renders summary in sidebar with copy/regenerate options.
5. Support summary length toggle (short / detailed).

---

### Phase 5: Generate Mode
**Goal**: Content generation with templates.

**Files to create/modify:**
| File | Change |
|------|--------|
| `src/features/ui/features/aiSider/modes/GenerateMode.tsx` | New: Generate UI (template selector, prompt input, output area) |
| `src/features/ui/features/aiSider/services/generator.ts` | New: Orchestrates generation requests |

**Templates:**
- Email (formal, casual)
- Blog post / article
- Social media post
- Code snippet
- Custom (freeform prompt)

---

### Phase 6: Explain & Quick Actions
**Goal**: Contextual AI assistance for selected text.

**Files to create/modify:**
| File | Change |
|------|--------|
| `src/features/ui/features/aiSider/modes/ExplainMode.tsx` | New: Explain selected text UI |
| `src/features/ui/features/aiSider/components/QuickActions.tsx` | New: Quick action buttons (fix grammar, simplify, translate, change tone) |
| `src/features/tabPluginManager/...` | Modify or create `AiTabPlugin` to inject context menu / selection handler |

**Context menu integration:**
- When user selects text on a page, a small popup or context menu option appears: "Ask AI" → opens sidebar with selected text pre-filled.
- Use the existing plugin system (`ITabPlugin`) to inject a selection change listener.

---

### Phase 7: Settings & Polish
**Goal**: User preferences and final polish.

| File | Change |
|------|--------|
| `src/features/ui/pages/setting/index.tsx` | Modify: Add "AI" tab to settings page |
| `src/features/ui/pages/setting/AiSettings.tsx` | New: AI settings panel (API key, model selection, default mode, shortcuts) |

**Settings options:**
- AI Provider: Groq / OpenAI / Custom
- API Key input (stored securely via `safeStorage` or env)
- Model selection (per provider)
- Default mode (Chat / Summarize / Generate)
- Keyboard shortcut customization
- Max tokens / temperature

---

## 4. Proposed Directory Structure

All AI sidebar code lives under `src/features/ui/features/aiSider/` — a single unified tree.

```
src/features/ui/features/aiSider/
├── components/
│   ├── AiSidebar.tsx              # Main sidebar container
│   ├── styles.module.css          # Styles
│   ├── index.ts                   # Export
│   ├── ModeTabs.tsx               # Mode switcher tabs
│   ├── ModelSelector.tsx          # Model dropdown
│   ├── QuickActions.tsx           # Quick action buttons
│   ├── MessageBubble.tsx          # Chat message component
│   └── MarkdownRenderer.tsx       # Markdown rendering
├── modes/
│   ├── ChatMode.tsx               # Chat interface
│   ├── SummaryMode.tsx            # Summarize view
│   ├── GenerateMode.tsx           # Content generation
│   ├── ExplainMode.tsx            # Explain selected text
│   └── index.ts                   # Export all modes
├── hooks/
│   └── useAiChat.ts               # React hook for AI chat
├── services/
│   ├── aiProvider.ts              # LLM provider abstraction
│   ├── pageReader.ts              # Page content extraction
│   ├── promptTemplates.ts         # Prompt templates
│   ├── summarizer.ts              # Summarize orchestration
│   └── generator.ts               # Generate orchestration
└── stores/
    └── useAiSidebarStore.ts       # Zustand store
```

---

## 5. IPC Channels to Add

```typescript
IPC_INVOKE_CHANNEL: {
  AI_CHAT_COMPLETION: "AI_CHAT_COMPLETION",       // Send prompt, get response
  AI_CHAT_STREAM: "AI_CHAT_STREAM",               // Streaming chat
  AI_GET_PAGE_TEXT: "AI_GET_PAGE_TEXT",           // Extract page text
  AI_GET_SELECTED_TEXT: "AI_GET_SELECTED_TEXT",   // Get selected text
  AI_SAVE_CONVERSATION: "AI_SAVE_CONVERSATION",   // Persist chat history
  AI_GET_CONVERSATIONS: "AI_GET_CONVERSATIONS",   // Load chat history
  AI_DELETE_CONVERSATION: "AI_DELETE_CONVERSATION",
}

IPC_RENDERER_EVENT: {
  AI_SELECTION_CHANGED: "AI_SELECTION_CHANGED",   // Text selected on page
}
```

---

## 6. Dependencies to Add

| Package | Purpose |
|---------|---------|
| `react-markdown` or `marked` | Render markdown in chat responses |
| `react-syntax-highlighter` | Syntax highlighting for code blocks (optional) |
| `highlight.js` | Lighter alternative for code highlighting |
| `lucide-react` or use existing `@tabler/icons-react` | AI-related icons (already have Tabler) |

---

## 7. Key UI/UX Decisions

- **Right-side placement**: The AI sidebar goes on the right — the left sidebar stays for tabs/browser navigation (Chrome's Sider also opens on the right).
- **Toggle**: AI icon in the header bar (between URL bar and window controls) + `Ctrl+Shift+I` shortcut.
- **Resizing**: Same drag-handle pattern as the existing left sidebar (`ResizableSidebar` component can be reused or adapted).
- **Responsive**: On narrow windows (< 900px), the AI sidebar auto-collapses or overlays instead of pushing content.
- **Loading states**: Skeleton loaders for streaming responses.
- **Error handling**: Clear error messages if API key is missing, rate limited, or network fails.

---

## 8. Estimated Effort

| Phase | Est. Time | Complexity |
|-------|-----------|------------|
| 1 — Foundation (sidebar shell) | 2-3 hours | Low |
| 2 — AI Service Layer | 3-4 hours | Medium |
| 3 — Chat Mode | 3-4 hours | Medium |
| 4 — Summarize Mode | 2-3 hours | Low |
| 5 — Generate Mode | 2-3 hours | Low |
| 6 — Explain & Quick Actions | 3-4 hours | Medium |
| 7 — Settings & Polish | 2-3 hours | Low |
| **Total** | **17-24 hours** | |

---

## 9. Getting Started

```
# Create directory structure (single tree under ui/features)
mkdir -p src/features/ui/features/aiSider/{components,modes,hooks,services,stores}

# Install new dependencies
npm install react-markdown remark-gfm rehype-highlight

# Start with Phase 1: Build the sidebar shell
```
