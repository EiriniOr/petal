import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Plus,
  Folder,
  FolderOpen,
  FileText,
  ChevronDown,
  ChevronRight,
  Trash2,
  Edit3,
  FolderPlus,
  ExternalLink,
  PinIcon
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useNotesStore } from '../store/notes'
import type { NoteMetadata } from '../types'

export default function Sidebar(): JSX.Element {
  const {
    notes,
    folders,
    currentNote,
    selectedFolder,
    selectNote,
    createNote,
    deleteNote,
    setSelectedFolder,
    openSearch,
    createFolder,
    renameNote
  } = useNotesStore()

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<{
    note: NoteMetadata
    x: number
    y: number
  } | null>(null)
  const [newFolderInput, setNewFolderInput] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [renamingNote, setRenamingNote] = useState<NoteMetadata | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const folderInputRef = useRef<HTMLInputElement>(null)

  const filteredNotes = selectedFolder
    ? notes.filter((n) => n.folder === selectedFolder)
    : notes.filter((n) => !n.folder)

  const allNotes = selectedFolder === '__all__' ? notes : filteredNotes

  const toggleFolder = (name: string): void => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const handleContextMenu = (e: React.MouseEvent, note: NoteMetadata): void => {
    e.preventDefault()
    setContextMenu({ note, x: e.clientX, y: e.clientY })
  }

  const handleCreateFolder = async (): Promise<void> => {
    if (!newFolderName.trim()) {
      setNewFolderInput(false)
      return
    }
    await createFolder(newFolderName.trim())
    setNewFolderName('')
    setNewFolderInput(false)
  }

  const startRename = (note: NoteMetadata): void => {
    setRenamingNote(note)
    setRenameValue(note.title)
    setContextMenu(null)
  }

  const commitRename = async (): Promise<void> => {
    if (renamingNote && renameValue.trim() && renameValue !== renamingNote.title) {
      await renameNote(renamingNote, renameValue.trim())
    }
    setRenamingNote(null)
  }

  return (
    <div
      className="flex flex-col h-full flex-shrink-0 overflow-hidden"
      style={{ width: 260, background: 'var(--bg-1)' }}
      onClick={() => setContextMenu(null)}
    >
      {/* Traffic light spacer + app name */}
      <div className="titlebar-drag flex items-end px-4 pb-3" style={{ paddingTop: 48 }}>
        <span
          className="text-sm font-semibold tracking-wide"
          style={{ color: 'var(--text)', letterSpacing: '0.04em' }}
        >
          petal
        </span>
      </div>

      {/* Search button */}
      <div className="px-3 mb-3 titlebar-no-drag">
        <button
          onClick={openSearch}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all"
          style={{
            background: 'var(--bg-3)',
            color: 'var(--text-3)',
            border: '1px solid var(--border)'
          }}
        >
          <Search size={13} />
          <span className="text-xs">Search notes...</span>
          <span className="ml-auto text-xs" style={{ color: 'var(--text-3)' }}>
            ⌘K
          </span>
        </button>
      </div>

      {/* Folders + Notes */}
      <div className="flex-1 overflow-y-auto px-2 titlebar-no-drag">
        {/* All Notes */}
        <SidebarSection
          label="Notes"
          onAdd={() => createNote(selectedFolder || undefined)}
          actions={
            <button
              onClick={() => {
                setNewFolderInput(true)
                setTimeout(() => folderInputRef.current?.focus(), 50)
              }}
              className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: 'var(--text-3)' }}
              title="New folder"
            >
              <FolderPlus size={13} />
            </button>
          }
        >
          {/* Folder list */}
          {folders.length > 0 && (
            <div className="mb-1">
              <button
                onClick={() => setSelectedFolder('__all__')}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all ${
                  selectedFolder === '__all__' ? 'font-medium' : 'hover:bg-white/5'
                }`}
                style={
                  selectedFolder === '__all__'
                    ? { background: 'var(--accent-dim)', color: 'var(--accent)' }
                    : { color: 'var(--text-2)' }
                }
              >
                <FileText size={13} />
                All notes
                <span className="ml-auto text-xs" style={{ color: 'var(--text-3)' }}>
                  {notes.length}
                </span>
              </button>

              {folders.map((folder) => {
                const isExpanded = expandedFolders.has(folder.name)
                const isSelected = selectedFolder === folder.name
                const folderNotes = notes.filter((n) => n.folder === folder.name)

                return (
                  <div key={folder.name}>
                    <button
                      onClick={() => {
                        toggleFolder(folder.name)
                        setSelectedFolder(folder.name)
                      }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all ${
                        isSelected ? 'font-medium' : 'hover:bg-white/5'
                      }`}
                      style={
                        isSelected
                          ? { background: 'var(--accent-dim)', color: 'var(--accent)' }
                          : { color: 'var(--text-2)' }
                      }
                    >
                      {isExpanded ? (
                        <ChevronDown size={12} />
                      ) : (
                        <ChevronRight size={12} />
                      )}
                      {isExpanded ? (
                        <FolderOpen size={13} />
                      ) : (
                        <Folder size={13} />
                      )}
                      <span className="truncate">{folder.name}</span>
                      <span className="ml-auto" style={{ color: 'var(--text-3)' }}>
                        {folder.count}
                      </span>
                    </button>

                    {/* Folder notes (collapsed list) */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15, ease: 'easeInOut' }}
                          className="overflow-hidden pl-4"
                        >
                          {folderNotes.map((note) => (
                            <NoteRow
                              key={note.id}
                              note={note}
                              isActive={currentNote?.id === note.id}
                              isRenaming={renamingNote?.id === note.id}
                              renameValue={renameValue}
                              onRenameChange={setRenameValue}
                              onRenameCommit={commitRename}
                              onSelect={() => selectNote(note)}
                              onContextMenu={(e) => handleContextMenu(e, note)}
                            />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          )}

          {/* New folder input */}
          <AnimatePresence>
            {newFolderInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-1"
              >
                <input
                  ref={folderInputRef}
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder()
                    if (e.key === 'Escape') {
                      setNewFolderInput(false)
                      setNewFolderName('')
                    }
                  }}
                  onBlur={handleCreateFolder}
                  placeholder="Folder name"
                  className="w-full px-2 py-1.5 rounded-md text-xs outline-none selectable"
                  style={{
                    background: 'var(--bg-3)',
                    border: '1px solid var(--accent)',
                    color: 'var(--text)'
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Root notes */}
          <div className="space-y-0.5">
            {allNotes.map((note) => (
              <NoteRow
                key={note.id}
                note={note}
                isActive={currentNote?.id === note.id}
                isRenaming={renamingNote?.id === note.id}
                renameValue={renameValue}
                onRenameChange={setRenameValue}
                onRenameCommit={commitRename}
                onSelect={() => selectNote(note)}
                onContextMenu={(e) => handleContextMenu(e, note)}
              />
            ))}

            {allNotes.length === 0 && (
              <div className="px-2 py-4 text-center">
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  No notes yet
                </p>
                <button
                  onClick={() => createNote(selectedFolder || undefined)}
                  className="mt-2 text-xs underline transition-opacity hover:opacity-80"
                  style={{ color: 'var(--accent)' }}
                >
                  Create one
                </button>
              </div>
            )}
          </div>
        </SidebarSection>
      </div>

      {/* Bottom bar */}
      <div
        className="px-3 py-2 flex items-center gap-2 titlebar-no-drag"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <button
          onClick={() => window.api.openNotesDir()}
          className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80"
          style={{ color: 'var(--text-3)' }}
        >
          <ExternalLink size={11} />
          Open in Finder
        </button>
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.08 }}
            className="fixed z-50 py-1 rounded-xl shadow-2xl overflow-hidden"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
              background: 'var(--bg-3)',
              border: '1px solid var(--border-strong)',
              minWidth: 160,
              backdropFilter: 'blur(20px)'
            }}
          >
            <ContextMenuItem
              icon={<Edit3 size={13} />}
              label="Rename"
              onClick={() => startRename(contextMenu.note)}
            />
            <ContextMenuItem
              icon={<PinIcon size={13} />}
              label="Pin to Desktop"
              onClick={() => {
                window.api.openSticky(contextMenu.note.id, contextMenu.note.path)
                setContextMenu(null)
              }}
            />
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 8px' }} />
            <ContextMenuItem
              icon={<Trash2 size={13} />}
              label="Delete"
              danger
              onClick={async () => {
                await deleteNote(contextMenu.note)
                setContextMenu(null)
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SidebarSection({
  label,
  children,
  onAdd,
  actions
}: {
  label: string
  children: React.ReactNode
  onAdd: () => void
  actions?: React.ReactNode
}): JSX.Element {
  return (
    <div className="mb-2">
      <div className="group flex items-center justify-between px-2 py-1 mb-1">
        <span className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--text-3)', fontSize: 10 }}>
          {label}
        </span>
        <div className="flex items-center gap-1">
          {actions}
          <button
            onClick={onAdd}
            className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: 'var(--text-3)' }}
            title="New note"
          >
            <Plus size={13} />
          </button>
        </div>
      </div>
      {children}
    </div>
  )
}

function NoteRow({
  note,
  isActive,
  isRenaming,
  renameValue,
  onRenameChange,
  onRenameCommit,
  onSelect,
  onContextMenu
}: {
  note: NoteMetadata
  isActive: boolean
  isRenaming: boolean
  renameValue: string
  onRenameChange: (v: string) => void
  onRenameCommit: () => void
  onSelect: () => void
  onContextMenu: (e: React.MouseEvent) => void
}): JSX.Element {
  return (
    <motion.button
      layout
      onClick={onSelect}
      onContextMenu={onContextMenu}
      className={`w-full text-left px-2.5 py-2 rounded-lg transition-all group relative ${
        isActive ? 'shadow-sm' : 'hover:bg-white/5'
      }`}
      style={
        isActive
          ? { background: 'var(--accent-dim)', border: '1px solid rgba(139,92,246,0.2)' }
          : { border: '1px solid transparent' }
      }
    >
      {isRenaming ? (
        <input
          value={renameValue}
          onChange={(e) => onRenameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onRenameCommit()
            if (e.key === 'Escape') onRenameCommit()
            e.stopPropagation()
          }}
          onBlur={onRenameCommit}
          onClick={(e) => e.stopPropagation()}
          autoFocus
          className="w-full text-xs outline-none bg-transparent selectable"
          style={{ color: 'var(--text)' }}
        />
      ) : (
        <>
          <div
            className="text-xs font-medium truncate mb-0.5"
            style={{ color: isActive ? '#c4b5fd' : 'var(--text)' }}
          >
            {note.title}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs truncate flex-1" style={{ color: 'var(--text-3)', fontSize: 11 }}>
              {note.preview || 'Empty note'}
            </span>
            <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-3)', fontSize: 10 }}>
              {formatDistanceToNow(new Date(note.modified), { addSuffix: false })}
            </span>
          </div>
          {note.tags.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {note.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{
                    background: 'var(--accent-dim)',
                    color: 'var(--accent)',
                    fontSize: 10
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </motion.button>
  )
}

function ContextMenuItem({
  icon,
  label,
  danger,
  onClick
}: {
  icon: React.ReactNode
  label: string
  danger?: boolean
  onClick: () => void
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors hover:bg-white/5"
      style={{ color: danger ? '#f87171' : 'var(--text-2)' }}
    >
      {icon}
      {label}
    </button>
  )
}
