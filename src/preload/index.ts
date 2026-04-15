import { contextBridge, ipcRenderer } from 'electron'

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
    ipcRenderer.invoke('dialog:save', defaultName)
}

export interface NoteMetadata {
  id: string
  title: string
  path: string
  folder: string
  modified: number
  created: number
  preview: string
  tags: string[]
}

export interface FolderInfo {
  name: string
  path: string
  count: number
}

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
contextBridge.exposeInMainWorld('electron', electron)

declare global {
  interface Window {
    api: typeof api
  }
}
