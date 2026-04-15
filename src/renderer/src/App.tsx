import { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useNotesStore } from './store/notes'

// Extend window for Electron IPC listener
declare global {
  interface Window {
    electron?: {
      ipcRenderer: {
        on: (channel: string, listener: () => void) => void
        off: (channel: string, listener: () => void) => void
      }
    }
  }
}
import Sidebar from './components/Sidebar'
import Toolbar from './components/Toolbar'
import Editor from './components/Editor'
import Preview from './components/Preview'
import SearchModal from './components/SearchModal'
import WelcomeScreen from './components/WelcomeScreen'

export default function App(): JSX.Element {
  const { init, currentNote, viewMode, searchOpen, openSearch, saveNote, createNote } = useNotesStore()

  useEffect(() => {
    init()
  }, [init])

  // Listen for tray menu "New Note"
  useEffect(() => {
    const handler = (): void => { createNote() }
    window.electron?.ipcRenderer.on('menu:new-note', handler)
    return () => window.electron?.ipcRenderer.off('menu:new-note', handler)
  }, [createNote])

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.metaKey && e.key === 'k') {
        e.preventDefault()
        openSearch()
      }
      if (e.metaKey && e.key === 's') {
        e.preventDefault()
        saveNote()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openSearch, saveNote])

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--bg-0)' }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Divider */}
      <div
        className="w-px flex-shrink-0"
        style={{ background: 'var(--border)', opacity: 0.8 }}
      />

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {currentNote && <Toolbar />}
        {currentNote ? (
          <div className="flex flex-1 overflow-hidden relative">
            {(viewMode === 'edit' || viewMode === 'split') && (
              <div
                className={`flex flex-col overflow-hidden ${
                  viewMode === 'split' ? 'w-1/2 border-r' : 'flex-1'
                }`}
                style={viewMode === 'split' ? { borderColor: 'var(--border)' } : {}}
              >
                <Editor />
              </div>
            )}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <div className={`flex flex-col overflow-hidden ${viewMode === 'split' ? 'w-1/2' : 'flex-1'}`}>
                <Preview />
              </div>
            )}
          </div>
        ) : (
          <WelcomeScreen />
        )}
      </div>

      {/* Search modal */}
      <AnimatePresence>
        {searchOpen && <SearchModal />}
      </AnimatePresence>
    </div>
  )
}
