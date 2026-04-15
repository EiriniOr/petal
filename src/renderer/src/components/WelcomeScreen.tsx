import { motion } from 'framer-motion'
import { PenLine, Search, FolderOpen } from 'lucide-react'
import { useNotesStore } from '../store/notes'

export default function WelcomeScreen(): JSX.Element {
  const { createNote, openSearch } = useNotesStore()

  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-1)' }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-sm px-8"
      >
        {/* Logo mark */}
        <div className="mb-8 flex justify-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, var(--accent) 0%, #a78bfa 100%)',
              boxShadow: '0 0 48px rgba(139, 92, 246, 0.3)'
            }}
          >
            <span className="text-2xl font-light text-white select-none" style={{ letterSpacing: '-0.05em' }}>
              p
            </span>
          </div>
        </div>

        <h1
          className="text-2xl font-semibold mb-2"
          style={{ color: 'var(--text)', letterSpacing: '-0.03em' }}
        >
          petal
        </h1>
        <p className="text-sm mb-10" style={{ color: 'var(--text-3)' }}>
          Your notes, beautifully simple.
        </p>

        <div className="space-y-2">
          <ActionButton
            icon={<PenLine size={15} />}
            label="New note"
            shortcut="⌘N"
            onClick={() => createNote()}
          />
          <ActionButton
            icon={<Search size={15} />}
            label="Search notes"
            shortcut="⌘K"
            onClick={openSearch}
          />
        </div>

        <p className="mt-8 text-xs" style={{ color: 'var(--text-3)' }}>
          Select a note from the sidebar to get started
        </p>
      </motion.div>
    </div>
  )
}

function ActionButton({
  icon,
  label,
  shortcut,
  onClick
}: {
  icon: React.ReactNode
  label: string
  shortcut: string
  onClick: () => void
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        color: 'var(--text-2)'
      }}
    >
      <span style={{ color: 'var(--accent)' }}>{icon}</span>
      <span className="text-sm flex-1">{label}</span>
      <kbd
        className="text-xs px-1.5 py-0.5 rounded"
        style={{
          background: 'var(--bg-4)',
          color: 'var(--text-3)',
          border: '1px solid var(--border)',
          fontFamily: 'monospace'
        }}
      >
        {shortcut}
      </kbd>
    </button>
  )
}
