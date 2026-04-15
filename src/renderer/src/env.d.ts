/// <reference types="vite/client" />

import type { NoteMetadata, FolderInfo } from './types'

declare global {
  interface Window {
    api: {
      getNotesDir: () => Promise<string>
      listNotes: () => Promise<NoteMetadata[]>
      readNote: (filePath: string) => Promise<string>
      writeNote: (filePath: string, content: string) => Promise<boolean>
      deleteNote: (filePath: string) => Promise<boolean>
      renameNote: (oldPath: string, newPath: string) => Promise<boolean>
      searchNotes: (query: string) => Promise<NoteMetadata[]>
      listFolders: () => Promise<FolderInfo[]>
      createFolder: (name: string) => Promise<string>
      openNotesDir: () => Promise<void>
      showSaveDialog: (defaultName: string) => Promise<string | undefined>
      importNotes: (destFolder?: string) => Promise<string[]>
      openSticky: (noteId: string, notePath: string) => Promise<void>
      listStickies: () => Promise<string[]>
    }
    stickyApi: {
      getInit: () => Promise<{
        noteId: string
        notePath: string
        content: string
        color: string
        pinned: boolean
      }>
      saveContent: (notePath: string, content: string) => Promise<boolean>
      setColor: (color: string) => Promise<void>
      setAlwaysOnTop: (value: boolean) => Promise<void>
      close: () => Promise<void>
    }
    electron?: {
      ipcRenderer: {
        on: (channel: string, listener: (...args: unknown[]) => void) => void
        off: (channel: string, listener: (...args: unknown[]) => void) => void
      }
    }
  }
}
