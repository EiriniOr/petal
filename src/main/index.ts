import { app, shell, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import * as fs from 'fs'
import * as path from 'path'

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_NOTES_DIR = path.join(app.getPath('documents'), 'Petal Notes')
const STICKIES_CONFIG = path.join(app.getPath('userData'), 'stickies.json')

// ─── State ───────────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

interface StickyMeta {
  noteId: string
  notePath: string
  color: string
  pinned: boolean
  x: number
  y: number
  width: number
  height: number
}

// noteId → { window, meta }
const stickyWindows = new Map<string, { win: BrowserWindow; meta: StickyMeta }>()

// windowId → noteId (for IPC lookup)
const windowToNote = new Map<number, string>()

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function loadStickiesConfig(): Record<string, StickyMeta> {
  try {
    if (fs.existsSync(STICKIES_CONFIG)) {
      return JSON.parse(fs.readFileSync(STICKIES_CONFIG, 'utf-8'))
    }
  } catch { /* ignore */ }
  return {}
}

function saveStickiesConfig(): void {
  const data: Record<string, StickyMeta> = {}
  for (const [noteId, { meta }] of stickyWindows) {
    data[noteId] = meta
  }
  fs.writeFileSync(STICKIES_CONFIG, JSON.stringify(data, null, 2), 'utf-8')
}

function getTrayIconPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'trayIconTemplate.png')
    : path.join(__dirname, '../../resources/trayIconTemplate.png')
}

function getStickyUrl(page: 'sticky'): string {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    return `${process.env['ELECTRON_RENDERER_URL']}/${page}.html`
  }
  return `file://${join(__dirname, `../renderer/${page}.html`)}`
}

// ─── Sticky windows ──────────────────────────────────────────────────────────

function createStickyWindow(meta: StickyMeta): BrowserWindow {
  const win = new BrowserWindow({
    x: meta.x,
    y: meta.y,
    width: meta.width,
    height: meta.height,
    minWidth: 160,
    minHeight: 120,
    show: false,
    frame: false,
    transparent: true,
    hasShadow: true,
    resizable: true,
    alwaysOnTop: meta.pinned,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  win.loadURL(getStickyUrl('sticky'))

  win.once('ready-to-show', () => {
    win.show()
  })

  // Track position/size changes
  const onMoved = (): void => {
    const [x, y] = win.getPosition()
    const entry = stickyWindows.get(meta.noteId)
    if (entry) {
      entry.meta.x = x
      entry.meta.y = y
      saveStickiesConfig()
    }
  }
  const onResized = (): void => {
    const [width, height] = win.getSize()
    const entry = stickyWindows.get(meta.noteId)
    if (entry) {
      entry.meta.width = width
      entry.meta.height = height
      saveStickiesConfig()
    }
  }

  win.on('moved', onMoved)
  win.on('resized', onResized)

  win.on('closed', () => {
    windowToNote.delete(win.id)
    stickyWindows.delete(meta.noteId)
    saveStickiesConfig()
  })

  stickyWindows.set(meta.noteId, { win, meta })
  windowToNote.set(win.id, meta.noteId)

  return win
}

function restoreStickies(): void {
  const saved = loadStickiesConfig()
  for (const [noteId, meta] of Object.entries(saved)) {
    // Only restore if the note file still exists
    if (fs.existsSync(meta.notePath)) {
      createStickyWindow({ ...meta, noteId })
    }
  }
}

// ─── Tray ────────────────────────────────────────────────────────────────────

function createTray(): void {
  const icon = nativeImage.createFromPath(getTrayIconPath())
  icon.setTemplateImage(true)
  tray = new Tray(icon)
  tray.setToolTip('Petal')

  const menu = Menu.buildFromTemplate([
    {
      label: 'Open Petal',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
        app.dock.show()
      }
    },
    { type: 'separator' },
    {
      label: 'New Note',
      accelerator: 'Cmd+N',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
        mainWindow?.webContents.send('menu:new-note')
      }
    },
    { type: 'separator' },
    {
      label: 'Quit Petal',
      accelerator: 'Cmd+Q',
      click: () => app.quit()
    }
  ])

  tray.setContextMenu(menu)
  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
      app.dock.hide()
    } else {
      mainWindow?.show()
      mainWindow?.focus()
      app.dock.show()
    }
  })
}

// ─── Main window ─────────────────────────────────────────────────────────────

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow!.show())

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow!.hide()
      app.dock.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

declare module 'electron' {
  interface App { isQuitting: boolean }
}
app.isQuitting = false

// ─── App lifecycle ───────────────────────────────────────────────────────────

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.petal.app')
  app.on('browser-window-created', (_, win) => optimizer.watchWindowShortcuts(win))

  ensureDir(DEFAULT_NOTES_DIR)
  registerIpcHandlers()
  createWindow()
  createTray()
  restoreStickies()

  app.on('activate', () => {
    mainWindow?.show()
    mainWindow?.focus()
    app.dock.show()
  })
})

app.on('before-quit', () => { app.isQuitting = true })
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── IPC: Notes ──────────────────────────────────────────────────────────────

function registerIpcHandlers(): void {
  ipcMain.handle('notes:get-dir', () => DEFAULT_NOTES_DIR)

  ipcMain.handle('notes:list', () => listNotesRecursive(DEFAULT_NOTES_DIR, DEFAULT_NOTES_DIR))

  ipcMain.handle('notes:read', (_e, filePath: string) => {
    try { return fs.readFileSync(filePath, 'utf-8') } catch { return '' }
  })

  ipcMain.handle('notes:write', (_e, filePath: string, content: string) => {
    ensureDir(path.dirname(filePath))
    fs.writeFileSync(filePath, content, 'utf-8')
    // Push update to any open sticky for this note
    for (const { win, meta } of stickyWindows.values()) {
      if (meta.notePath === filePath) {
        win.webContents.send('note:content-updated', content)
      }
    }
    return true
  })

  ipcMain.handle('notes:delete', (_e, filePath: string) => {
    try { fs.unlinkSync(filePath); return true } catch { return false }
  })

  ipcMain.handle('notes:rename', (_e, oldPath: string, newPath: string) => {
    try { ensureDir(path.dirname(newPath)); fs.renameSync(oldPath, newPath); return true } catch { return false }
  })

  ipcMain.handle('folders:list', () => listFolders(DEFAULT_NOTES_DIR))

  ipcMain.handle('folders:create', (_e, name: string) => {
    const p = path.join(DEFAULT_NOTES_DIR, name)
    ensureDir(p)
    return p
  })

  ipcMain.handle('notes:open-dir', () => shell.openPath(DEFAULT_NOTES_DIR))

  ipcMain.handle('notes:search', (_e, query: string) => {
    if (!query.trim()) return []
    const notes = listNotesRecursive(DEFAULT_NOTES_DIR, DEFAULT_NOTES_DIR)
    const q = query.toLowerCase()
    return notes.filter((n) => {
      try {
        return n.title.toLowerCase().includes(q) ||
          fs.readFileSync(n.path, 'utf-8').toLowerCase().includes(q)
      } catch { return false }
    })
  })

  ipcMain.handle('dialog:save', async (_e, defaultName: string) => {
    const result = await dialog.showSaveDialog({
      defaultPath: path.join(app.getPath('desktop'), defaultName),
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
    return result.filePath
  })

  // ─── IPC: Stickies ──────────────────────────────────────────────────────

  // Open/create a sticky for a note
  ipcMain.handle('sticky:open', (_e, noteId: string, notePath: string) => {
    // If already open, just focus it
    const existing = stickyWindows.get(noteId)
    if (existing) {
      existing.win.focus()
      return
    }

    // Get a sensible default position (cascade stickies)
    const offset = stickyWindows.size * 30
    const meta: StickyMeta = {
      noteId,
      notePath,
      color: 'yellow',
      pinned: false,
      x: 80 + offset,
      y: 80 + offset,
      width: 280,
      height: 240
    }
    createStickyWindow(meta)
    saveStickiesConfig()
  })

  // Close a sticky (called from the sticky window itself or main app)
  ipcMain.handle('sticky:close', (e) => {
    const noteId = windowToNote.get(e.sender.id)
    if (noteId) {
      stickyWindows.get(noteId)?.win.destroy()
      stickyWindows.delete(noteId)
      windowToNote.delete(e.sender.id)
      saveStickiesConfig()
    }
  })

  // Sticky renderer calls this to get its init data
  ipcMain.handle('sticky:get-init', async (e) => {
    const noteId = windowToNote.get(e.sender.id)
    if (!noteId) return null
    const entry = stickyWindows.get(noteId)
    if (!entry) return null
    let content = ''
    try { content = fs.readFileSync(entry.meta.notePath, 'utf-8') } catch { /* */ }
    return {
      noteId: entry.meta.noteId,
      notePath: entry.meta.notePath,
      content,
      color: entry.meta.color,
      pinned: entry.meta.pinned
    }
  })

  // Save content from sticky
  ipcMain.handle('sticky:save-content', (_e, notePath: string, content: string) => {
    try {
      ensureDir(path.dirname(notePath))
      fs.writeFileSync(notePath, content, 'utf-8')
      // Push update to main window so its editor stays in sync
      mainWindow?.webContents.send('note:file-updated', notePath, content)
      return true
    } catch { return false }
  })

  // Update color
  ipcMain.handle('sticky:set-color', (e, color: string) => {
    const noteId = windowToNote.get(e.sender.id)
    if (noteId) {
      const entry = stickyWindows.get(noteId)
      if (entry) {
        entry.meta.color = color
        saveStickiesConfig()
      }
    }
  })

  // Toggle always-on-top
  ipcMain.handle('sticky:set-always-on-top', (e, value: boolean) => {
    const noteId = windowToNote.get(e.sender.id)
    if (noteId) {
      const entry = stickyWindows.get(noteId)
      if (entry) {
        entry.win.setAlwaysOnTop(value)
        entry.meta.pinned = value
        saveStickiesConfig()
      }
    }
  })

  // List open stickies (for main app to show which notes are pinned)
  ipcMain.handle('sticky:list', () => {
    return Array.from(stickyWindows.keys())
  })
}

// ─── File helpers ─────────────────────────────────────────────────────────────

interface NoteMetadata {
  id: string; title: string; path: string; folder: string
  modified: number; created: number; preview: string; tags: string[]
}

function listNotesRecursive(dir: string, baseDir: string): NoteMetadata[] {
  const notes: NoteMetadata[] = []
  if (!fs.existsSync(dir)) return notes

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      notes.push(...listNotesRecursive(fullPath, baseDir))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const stat = fs.statSync(fullPath)
      const relativePath = path.relative(baseDir, fullPath)
      const folder = path.dirname(relativePath) === '.' ? '' : path.dirname(relativePath)
      let preview = ''
      let tags: string[] = []
      try {
        const content = fs.readFileSync(fullPath, 'utf-8')
        const tagMatch = content.match(/^tags:\s*\[([^\]]+)\]/m)
        if (tagMatch) tags = tagMatch[1].split(',').map((t) => t.trim().replace(/['"]/g, ''))
        const hashTags = content.match(/#(\w+)/g)
        if (hashTags) tags = [...new Set([...tags, ...hashTags.map((t) => t.slice(1))])]
        preview = content.split('\n').filter((l) => !l.startsWith('#') && l.trim()).slice(0, 3).join(' ').slice(0, 120)
      } catch { /* */ }
      notes.push({
        id: relativePath, title: entry.name.replace(/\.md$/, ''),
        path: fullPath, folder, modified: stat.mtimeMs, created: stat.birthtimeMs, preview, tags
      })
    }
  }
  return notes.sort((a, b) => b.modified - a.modified)
}

function listFolders(baseDir: string): { name: string; path: string; count: number }[] {
  if (!fs.existsSync(baseDir)) return []
  return fs.readdirSync(baseDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => ({
      name: e.name,
      path: path.join(baseDir, e.name),
      count: countMarkdownFiles(path.join(baseDir, e.name))
    }))
}

function countMarkdownFiles(dir: string): number {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce((acc, e) => {
    if (e.isFile() && e.name.endsWith('.md')) return acc + 1
    if (e.isDirectory()) return acc + countMarkdownFiles(path.join(dir, e.name))
    return acc
  }, 0)
}
