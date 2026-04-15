import { contextBridge, ipcRenderer } from 'electron'

// ─── Main app API ─────────────────────────────────────────────────────────────

const api = {
  getNotesDir: (): Promise<string> => ipcRenderer.invoke('notes:get-dir'),
  listNotes: (): Promise<NoteMetadata[]> => ipcRenderer.invoke('notes:list'),
  readNote: (filePath: string): Promise<string> => ipcRenderer.invoke('notes:read', filePath),
  writeNote: (filePath: string, content: string): Promise<boolean> =>
    ipcRenderer.invoke('notes:write', filePath, content),
  deleteNote: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke('notes:delete', filePath),
  renameNote: (oldPath: string, newPath: string): Promise<boolean> =>
    ipcRenderer.invoke('notes:rename', oldPath, newPath),
  searchNotes: (query: string): Promise<NoteMetadata[]> =>
    ipcRenderer.invoke('notes:search', query),
  listFolders: (): Promise<FolderInfo[]> => ipcRenderer.invoke('folders:list'),
  createFolder: (name: string): Promise<string> => ipcRenderer.invoke('folders:create', name),
  openNotesDir: (): Promise<void> => ipcRenderer.invoke('notes:open-dir'),
  showSaveDialog: (defaultName: string): Promise<string | undefined> =>
    ipcRenderer.invoke('dialog:save', defaultName),
  importNotes: (destFolder?: string): Promise<string[]> =>
    ipcRenderer.invoke('notes:import', destFolder),
  // Stickies
  openSticky: (noteId: string, notePath: string): Promise<void> =>
    ipcRenderer.invoke('sticky:open', noteId, notePath),
  listStickies: (): Promise<string[]> => ipcRenderer.invoke('sticky:list')
}

// ─── Sticky window API (used only in sticky renderer) ────────────────────────

const stickyApi = {
  getInit: () => ipcRenderer.invoke('sticky:get-init'),
  saveContent: (notePath: string, content: string): Promise<boolean> =>
    ipcRenderer.invoke('sticky:save-content', notePath, content),
  setColor: (color: string): Promise<void> =>
    ipcRenderer.invoke('sticky:set-color', color),
  setAlwaysOnTop: (value: boolean): Promise<void> =>
    ipcRenderer.invoke('sticky:set-always-on-top', value),
  close: (): Promise<void> => ipcRenderer.invoke('sticky:close')
}

// ─── Electron IPC bridge (for push events) ───────────────────────────────────

const electron = {
  ipcRenderer: {
    on: (channel: string, listener: (...args: unknown[]) => void): void => {
      ipcRenderer.on(channel, (_event, ...args) => listener(...args))
    },
    off: (channel: string, listener: (...args: unknown[]) => void): void => {
      ipcRenderer.removeListener(channel, listener)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)
contextBridge.exposeInMainWorld('stickyApi', stickyApi)
contextBridge.exposeInMainWorld('electron', electron)

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NoteMetadata {
  id: string; title: string; path: string; folder: string
  modified: number; created: number; preview: string; tags: string[]
}

export interface FolderInfo {
  name: string; path: string; count: number
}
