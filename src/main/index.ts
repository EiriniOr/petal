import { app, shell, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import * as fs from 'fs'
import * as path from 'path'

// Default notes directory
const DEFAULT_NOTES_DIR = path.join(app.getPath('documents'), 'Petal Notes')

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function getTrayIconPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'trayIconTemplate.png')
  }
  return path.join(__dirname, '../../resources/trayIconTemplate.png')
}

function createTray(): void {
  const iconPath = getTrayIconPath()
  const icon = nativeImage.createFromPath(iconPath)
  icon.setTemplateImage(true) // auto invert for dark/light menu bar

  tray = new Tray(icon)
  tray.setToolTip('Petal')

  const menu = Menu.buildFromTemplate([
    {
      label: 'Open Petal',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
          app.dock.show()
        }
      }
    },
    { type: 'separator' },
    {
      label: 'New Note',
      accelerator: 'Cmd+N',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
          mainWindow.webContents.send('menu:new-note')
        }
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

  // Left-click shows the window
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
        app.dock.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
        app.dock.show()
      }
    }
  })
}

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

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  // Close button minimizes to tray rather than quitting
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow!.hide()
      app.dock.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Extend App type for quit flag
declare module 'electron' {
  interface App {
    isQuitting: boolean
  }
}
app.isQuitting = false

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.petal.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ensureDir(DEFAULT_NOTES_DIR)
  registerIpcHandlers()
  createWindow()
  createTray()

  app.on('activate', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
      app.dock.show()
    }
  })
})

app.on('before-quit', () => {
  app.isQuitting = true
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── IPC Handlers ────────────────────────────────────────────────────────────

function registerIpcHandlers(): void {
  ipcMain.handle('notes:get-dir', () => DEFAULT_NOTES_DIR)

  ipcMain.handle('notes:list', async () => {
    return listNotesRecursive(DEFAULT_NOTES_DIR, DEFAULT_NOTES_DIR)
  })

  ipcMain.handle('notes:read', async (_event, filePath: string) => {
    try {
      return fs.readFileSync(filePath, 'utf-8')
    } catch {
      return ''
    }
  })

  ipcMain.handle('notes:write', async (_event, filePath: string, content: string) => {
    ensureDir(path.dirname(filePath))
    fs.writeFileSync(filePath, content, 'utf-8')
    return true
  })

  ipcMain.handle('notes:delete', async (_event, filePath: string) => {
    try {
      fs.unlinkSync(filePath)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('notes:rename', async (_event, oldPath: string, newPath: string) => {
    try {
      ensureDir(path.dirname(newPath))
      fs.renameSync(oldPath, newPath)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('folders:list', async () => {
    return listFolders(DEFAULT_NOTES_DIR)
  })

  ipcMain.handle('folders:create', async (_event, name: string) => {
    const folderPath = path.join(DEFAULT_NOTES_DIR, name)
    ensureDir(folderPath)
    return folderPath
  })

  ipcMain.handle('notes:open-dir', async () => {
    shell.openPath(DEFAULT_NOTES_DIR)
  })

  ipcMain.handle('notes:search', async (_event, query: string) => {
    if (!query.trim()) return []
    const notes = listNotesRecursive(DEFAULT_NOTES_DIR, DEFAULT_NOTES_DIR)
    const q = query.toLowerCase()
    return notes.filter((note) => {
      try {
        const content = fs.readFileSync(note.path, 'utf-8').toLowerCase()
        return note.title.toLowerCase().includes(q) || content.includes(q)
      } catch {
        return false
      }
    })
  })

  ipcMain.handle('dialog:save', async (_event, defaultName: string) => {
    const result = await dialog.showSaveDialog({
      defaultPath: path.join(app.getPath('desktop'), defaultName),
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
    return result.filePath
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface NoteMetadata {
  id: string
  title: string
  path: string
  folder: string
  modified: number
  created: number
  preview: string
  tags: string[]
}

function listNotesRecursive(dir: string, baseDir: string): NoteMetadata[] {
  const notes: NoteMetadata[] = []
  if (!fs.existsSync(dir)) return notes

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
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
        if (tagMatch) {
          tags = tagMatch[1].split(',').map((t) => t.trim().replace(/['"]/g, ''))
        }
        const hashTags = content.match(/#(\w+)/g)
        if (hashTags) {
          tags = [...new Set([...tags, ...hashTags.map((t) => t.slice(1))])]
        }
        const bodyLines = content
          .split('\n')
          .filter((l) => !l.startsWith('#') && l.trim())
          .slice(0, 3)
          .join(' ')
        preview = bodyLines.slice(0, 120)
      } catch {
        // ignore
      }

      notes.push({
        id: relativePath,
        title: entry.name.replace(/\.md$/, ''),
        path: fullPath,
        folder,
        modified: stat.mtimeMs,
        created: stat.birthtimeMs,
        preview,
        tags
      })
    }
  }
  return notes.sort((a, b) => b.modified - a.modified)
}

function listFolders(baseDir: string): { name: string; path: string; count: number }[] {
  const folders: { name: string; path: string; count: number }[] = []
  if (!fs.existsSync(baseDir)) return folders

  const entries = fs.readdirSync(baseDir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      const folderPath = path.join(baseDir, entry.name)
      folders.push({ name: entry.name, path: folderPath, count: countMarkdownFiles(folderPath) })
    }
  }
  return folders
}

function countMarkdownFiles(dir: string): number {
  let count = 0
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.md')) count++
    else if (entry.isDirectory()) count += countMarkdownFiles(path.join(dir, entry.name))
  }
  return count
}
