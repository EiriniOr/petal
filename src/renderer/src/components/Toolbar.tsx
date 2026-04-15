import { Eye, Edit, Columns, Save } from 'lucide-react'
import { useNotesStore } from '../store/notes'
import type { ViewMode } from '../types'

export default function Toolbar(): JSX.Element {
  const { currentNote, currentContent, savedContent, viewMode, setViewMode, saveNote } =
    useNotesStore()
  const isDirty = currentContent !== savedContent

  return (
    <div
      className="flex items-center justify-between px-4 flex-shrink-0 titlebar-drag"
      style={{ height: 44, borderBottom: '1px solid var(--border)', background: 'var(--bg-1)' }}
    >
      <span
        className="text-sm font-medium truncate max-w-xs titlebar-no-drag"
        style={{ color: 'var(--text)' }}
      >
        {currentNote?.title}
        {isDirty && (
          <span
            className="ml-2 w-1.5 h-1.5 rounded-full inline-block"
            style={{ background: 'var(--accent)' }}
          />
        )}
      </span>

      <div className="flex items-center gap-1 titlebar-no-drag">
        {isDirty && (
          <button
            onClick={saveNote}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all hover:opacity-80"
            style={{ color: 'var(--accent)', background: 'var(--accent-dim)' }}
          >
            <Save size={12} />
            Save
          </button>
        )}

        <div
          className="flex items-center rounded-lg p-0.5"
          style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}
        >
          <ViewButton icon={<Edit size={13} />} label="Edit" mode="edit" current={viewMode} onChange={setViewMode} />
          <ViewButton icon={<Columns size={13} />} label="Split" mode="split" current={viewMode} onChange={setViewMode} />
          <ViewButton icon={<Eye size={13} />} label="Preview" mode="preview" current={viewMode} onChange={setViewMode} />
        </div>
      </div>
    </div>
  )
}

function ViewButton({
  icon, label, mode, current, onChange
}: {
  icon: React.ReactNode; label: string; mode: ViewMode; current: ViewMode; onChange: (m: ViewMode) => void
}): JSX.Element {
  return (
    <button
      onClick={() => onChange(mode)}
      title={label}
      className="flex items-center justify-center w-7 h-6 rounded-md transition-all"
      style={mode === current ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--text-3)' }}
    >
      {icon}
    </button>
  )
}
