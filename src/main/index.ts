import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import * as fs from 'fs'
import * as path from 'path'

// Default notes directory
const DEFAULT_NOTES_DIR = path.join(app.getPath('documents'), 'Petal Notes')

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function createWindow(): void {
  const win = new BrowserWindow({
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

  win.on('ready-to-show', () => {
    win.show()
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.petal')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ensureDir(DEFAULT_NOTES_DIR)
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── IPC Handlers ────────────────────────────────────────────────────────────

function registerIpcHandlers(): void {
  // Get the notes directory path
  ipcMain.handle('notes:get-dir', () => DEFAULT_NOTES_DIR)

  // List all notes (recursively, with metadata)
  ipcMain.handle('notes:list', async () => {
    return listNotesRecursive(DEFAULT_NOTES_DIR, DEFAULT_NOTES_DIR)
  })

  // Read a single note
  ipcMain.handle('notes:read', async (_event, filePath: string) => {
    try {
      return fs.readFileSync(filePath, 'utf-8')
    } catch {
      return ''
    }
  })

  // Write/save a note
  ipcMain.handle('notes:write', async (_event, filePath: string, content: string) => {
    ensureDir(path.dirname(filePath))
    fs.writeFileSync(filePath, content, 'utf-8')
    return true
  })

  // Delete a note
  ipcMain.handle('notes:delete', async (_event, filePath: string) => {
    try {
      fs.unlinkSync(filePath)
      return true
    } catch {
      return false
    }
  })

  // Rename a note
  ipcMain.handle('notes:rename', async (_event, oldPath: string, newPath: string) => {
    try {
      ensureDir(path.dirname(newPath))
      fs.renameSync(oldPath, newPath)
      return true
    } catch {
      return false
    }
  })

  // List folders
  ipcMain.handle('folders:list', async () => {
    return listFolders(DEFAULT_NOTES_DIR)
  })

  // Create folder
  ipcMain.handle('folders:create', async (_event, name: string) => {
    const folderPath = path.join(DEFAULT_NOTES_DIR, name)
    ensureDir(folderPath)
    return folderPath
  })

  // Open notes directory in Finder
  ipcMain.handle('notes:open-dir', async () => {
    shell.openPath(DEFAULT_NOTES_DIR)
  })

  // Full-text search (simple grep-style)
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

  // Show save dialog (for exporting)
  ipcMain.handle('dialog:save', async (_event, defaultName: string) => {
    const result = await dialog.showSaveDialog({
      defaultPath: path.join(app.getPath('desktop'), defaultName),
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
    return result.filePath
  })
}

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
        // Extract tags from front matter or #hashtags
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

      const title = entry.name.replace(/\.md$/, '')
      notes.push({
        id: relativePath,
        title,
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
      const count = countMarkdownFiles(folderPath)
      folders.push({ name: entry.name, path: folderPath, count })
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
