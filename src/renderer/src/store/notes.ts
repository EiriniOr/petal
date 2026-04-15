import { create } from 'zustand'
import path from 'path-browserify'
import type { NoteMetadata, FolderInfo, ViewMode } from '../types'

interface NotesState {
  notesDir: string
  notes: NoteMetadata[]
  folders: FolderInfo[]
  currentNote: NoteMetadata | null
  currentContent: string
  savedContent: string
  viewMode: ViewMode
  selectedFolder: string | null
  searchQuery: string
  searchOpen: boolean
  searchResults: NoteMetadata[]
  isLoading: boolean
  sidebarWidth: number

  // Actions
  init: () => Promise<void>
  selectNote: (note: NoteMetadata) => Promise<void>
  saveNote: () => Promise<void>
  createNote: (folder?: string) => Promise<void>
  deleteNote: (note: NoteMetadata) => Promise<void>
  renameNote: (note: NoteMetadata, newTitle: string) => Promise<void>
  setContent: (content: string) => void
  syncFromSticky: (notePath: string, content: string) => void
  setViewMode: (mode: ViewMode) => void
  setSelectedFolder: (folder: string | null) => void
  openSearch: () => void
  closeSearch: () => void
  setSearchQuery: (q: string) => Promise<void>
  refresh: () => Promise<void>
  createFolder: (name: string) => Promise<void>
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notesDir: '',
  notes: [],
  folders: [],
  currentNote: null,
  currentContent: '',
  savedContent: '',
  viewMode: 'split',
  selectedFolder: null,
  searchQuery: '',
  searchOpen: false,
  searchResults: [],
  isLoading: false,
  sidebarWidth: 260,

  init: async () => {
    set({ isLoading: true })
    const notesDir = await window.api.getNotesDir()
    const [notes, folders] = await Promise.all([window.api.listNotes(), window.api.listFolders()])
    set({ notesDir, notes, folders, isLoading: false })
  },

  refresh: async () => {
    const [notes, folders] = await Promise.all([window.api.listNotes(), window.api.listFolders()])
    set({ notes, folders })
  },

  selectNote: async (note: NoteMetadata) => {
    const { currentNote, currentContent, savedContent } = get()
    // Auto-save current note if dirty
    if (currentNote && currentContent !== savedContent) {
      await window.api.writeNote(currentNote.path, currentContent)
    }
    const content = await window.api.readNote(note.path)
    set({ currentNote: note, currentContent: content, savedContent: content })
  },

  saveNote: async () => {
    const { currentNote, currentContent } = get()
    if (!currentNote) return
    await window.api.writeNote(currentNote.path, currentContent)
    set({ savedContent: currentContent })
    await get().refresh()
  },

  createNote: async (folder?: string) => {
    const { notesDir } = get()
    const timestamp = Date.now()
    const title = `Untitled ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    const dir = folder ? path.join(notesDir, folder) : notesDir
    const filePath = path.join(dir, `${title}.md`)
    const content = `# ${title}\n\n`
    await window.api.writeNote(filePath, content)
    await get().refresh()
    const notes = get().notes
    const newNote = notes.find((n) => n.path === filePath)
    if (newNote) {
      await get().selectNote(newNote)
    }
  },

  deleteNote: async (note: NoteMetadata) => {
    await window.api.deleteNote(note.path)
    const { currentNote } = get()
    if (currentNote?.id === note.id) {
      set({ currentNote: null, currentContent: '', savedContent: '' })
    }
    await get().refresh()
  },

  renameNote: async (note: NoteMetadata, newTitle: string) => {
    const dir = path.dirname(note.path)
    const newPath = path.join(dir, `${newTitle}.md`)
    await window.api.renameNote(note.path, newPath)
    const { currentNote } = get()
    await get().refresh()
    if (currentNote?.id === note.id) {
      const notes = get().notes
      const updated = notes.find((n) => n.path === newPath)
      if (updated) set({ currentNote: updated })
    }
  },

  setContent: (content: string) => set({ currentContent: content }),

  // Called when a sticky saves — only sync if it's the currently open note
  // and the editor isn't mid-edit (not dirty), to avoid overwriting unsaved work
  syncFromSticky: (notePath: string, content: string) => {
    const { currentNote, currentContent, savedContent } = get()
    if (!currentNote || currentNote.path !== notePath) return
    // Only update if editor is clean (not dirty) to avoid clobbering unsaved edits
    if (currentContent === savedContent) {
      set({ currentContent: content, savedContent: content })
    }
  },

  setViewMode: (mode: ViewMode) => set({ viewMode: mode }),

  setSelectedFolder: (folder: string | null) => set({ selectedFolder: folder }),

  openSearch: () => set({ searchOpen: true }),

  closeSearch: () => set({ searchOpen: false, searchQuery: '', searchResults: [] }),

  setSearchQuery: async (q: string) => {
    set({ searchQuery: q })
    if (!q.trim()) {
      set({ searchResults: [] })
      return
    }
    const results = await window.api.searchNotes(q)
    set({ searchResults: results })
  },

  createFolder: async (name: string) => {
    await window.api.createFolder(name)
    await get().refresh()
  }
}))
