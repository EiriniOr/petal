# Petal

A beautiful local markdown notes app for macOS. Notes are stored as plain `.md` files on disk — no cloud, no accounts.

![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron) ![React](https://img.shields.io/badge/React-18-61DAFB?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)

## Features

- **Markdown editor** — CodeMirror 6 with syntax highlighting
- **Split / preview / edit modes** — toggle at any time
- **Local file storage** — notes live in `~/Documents/Petal Notes/` as `.md` files
- **Folders & tags** — organise notes into folders, tag with `#hashtag` or front matter
- **Full-text search** — `⌘K` to open the command palette
- **Desktop sticky notes** — pin any note to the desktop as a floating widget
- **Menu bar icon** — lives in the macOS menu bar, close the window without quitting
- **macOS-native feel** — vibrancy, hidden inset title bar, native window controls

## Getting Started

### Requirements

- Node.js 18+
- macOS (arm64 / Apple Silicon)

### Development

```bash
npm install
npm run dev
```

### Build (distributable DMG)

```bash
npm run package:mac
```

Output: `dist/Petal-0.1.0-arm64.dmg`

Open the DMG, drag Petal to `/Applications`. On first launch macOS may warn about an unidentified developer — right-click the app → **Open** to bypass.

## Usage

| Action | How |
|---|---|
| New note | Hover the **Notes** section header → `+` |
| Search | `⌘K` |
| Save | `⌘S` or the Save button |
| Switch view | Edit / Split / Preview toggle in the toolbar |
| Pin to desktop | Right-click a note → **Pin to Desktop** |
| Change sticky colour | Click the colour dots in the sticky header |
| Keep sticky on top | Click the pin icon in the sticky header |
| Open notes in Finder | Bottom of sidebar → **Open in Finder** |
| Hide to menu bar | Close the window — app stays alive in the menu bar |
| Quit fully | `⌘Q` or menu bar → **Quit Petal** |

## Project Structure

```
src/
├── main/           # Electron main process — window management, IPC, file I/O
├── preload/        # Context bridge — exposes typed IPC API to renderer
└── renderer/
    └── src/
        ├── App.tsx
        ├── Sticky.tsx          # Desktop sticky note widget
        ├── components/
        │   ├── Sidebar.tsx     # Folder tree + note list
        │   ├── Toolbar.tsx     # Title bar + view mode toggle
        │   ├── Editor.tsx      # CodeMirror markdown editor
        │   ├── Preview.tsx     # react-markdown rendered output
        │   ├── SearchModal.tsx # ⌘K command palette
        │   └── WelcomeScreen.tsx
        └── store/
            └── notes.ts        # Zustand state + async actions
```

## Stack

- [Electron](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/)
- [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/)
- [CodeMirror 6](https://codemirror.net/) via `@uiw/react-codemirror`
- [Zustand](https://zustand-demo.pmnd.rs/) for state management
- [react-markdown](https://github.com/remarkjs/react-markdown) + [remark-gfm](https://github.com/remarkjs/remark-gfm)
