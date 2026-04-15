import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, FileText, ArrowRight, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useNotesStore } from '../store/notes'
import type { NoteMetadata } from '../types'

export default function SearchModal(): JSX.Element {
  const { searchQuery, searchResults, setSearchQuery, closeSearch, selectNote, notes } =
    useNotesStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState(0)

  const results = searchQuery.trim() ? searchResults : notes.slice(0, 8)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSelected(0)
  }, [searchQuery])

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closeSearch()
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelected((s) => Math.min(s + 1, results.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelected((s) => Math.max(s - 1, 0))
      }
      if (e.key === 'Enter' && results[selected]) {
        selectNote(results[selected])
        closeSearch()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [results, selected, selectNote, closeSearch])

  const handleSelect = (note: NoteMetadata): void => {
    selectNote(note)
    closeSearch()
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={closeSearch}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -8 }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="fixed z-50 left-1/2 -translate-x-1/2 top-24 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border-strong)'
        }}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <Search size={16} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="flex-1 bg-transparent outline-none text-sm selectable"
            style={{ color: 'var(--text)' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-0.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: 'var(--text-3)' }}
            >
              <X size={14} />
            </button>
          )}
          <kbd
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              background: 'var(--bg-4)',
              color: 'var(--text-3)',
              border: '1px solid var(--border)'
            }}
          >
            esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-1">
          {results.length === 0 && searchQuery && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                No results for &ldquo;{searchQuery}&rdquo;
              </p>
            </div>
          )}

          {results.map((note, i) => (
            <button
              key={note.id}
              onClick={() => handleSelect(note)}
              onMouseEnter={() => setSelected(i)}
              className="w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors"
              style={{
                background: i === selected ? 'var(--accent-dim)' : 'transparent'
              }}
            >
              <FileText
                size={14}
                className="mt-0.5 flex-shrink-0"
                style={{ color: i === selected ? 'var(--accent)' : 'var(--text-3)' }}
              />
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-medium truncate"
                  style={{ color: i === selected ? '#c4b5fd' : 'var(--text)' }}
                >
                  {highlightMatch(note.title, searchQuery)}
                </div>
                {note.preview && (
                  <div className="text-xs truncate mt-0.5" style={{ color: 'var(--text-3)' }}>
                    {note.preview}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {note.folder && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--bg-4)', color: 'var(--text-3)' }}
                  >
                    {note.folder}
                  </span>
                )}
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {formatDistanceToNow(new Date(note.modified), { addSuffix: false })}
                </span>
                {i === selected && (
                  <ArrowRight size={13} style={{ color: 'var(--accent)' }} />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2 flex items-center gap-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <FooterHint keys={['↑', '↓']} label="navigate" />
          <FooterHint keys={['↵']} label="open" />
          <FooterHint keys={['esc']} label="close" />
        </div>
      </motion.div>
    </>
  )
}

function FooterHint({ keys, label }: { keys: string[]; label: string }): JSX.Element {
  return (
    <div className="flex items-center gap-1">
      {keys.map((k) => (
        <kbd
          key={k}
          className="text-xs px-1.5 py-0.5 rounded"
          style={{
            background: 'var(--bg-4)',
            color: 'var(--text-3)',
            border: '1px solid var(--border)',
            fontFamily: 'monospace'
          }}
        >
          {k}
        </kbd>
      ))}
      <span className="text-xs ml-1" style={{ color: 'var(--text-3)' }}>
        {label}
      </span>
    </div>
  )
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  )
}
