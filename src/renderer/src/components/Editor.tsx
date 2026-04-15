import { useCallback, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { EditorView } from '@codemirror/view'
import { dracula } from '@uiw/codemirror-theme-dracula'
import { Eye, Edit, Columns, Save, MoreHorizontal } from 'lucide-react'
import { useNotesStore } from '../store/notes'
import type { ViewMode } from '../types'

const petalTheme = EditorView.theme({
  '&': {
    background: 'var(--bg-1) !important',
    color: 'var(--text) !important',
    height: '100%'
  },
  '.cm-scroller': {
    fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace !important"
  },
  '.cm-content': {
    caretColor: '#8b5cf6'
  },
  '.cm-cursor': {
    borderLeftColor: '#8b5cf6',
    borderLeftWidth: '2px'
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255,255,255,0.02) !important'
  },
  '.cm-selectionBackground': {
    backgroundColor: 'rgba(139,92,246,0.2) !important'
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(139,92,246,0.25) !important'
  },
  '.cm-gutters': {
    display: 'none'
  }
})

export default function Editor(): JSX.Element {
  const { currentNote, currentContent, viewMode, savedContent, setContent, setViewMode, saveNote } =
    useNotesStore()
  const isDirty = currentContent !== savedContent

  const onChange = useCallback(
    (value: string) => {
      setContent(value)
    },
    [setContent]
  )

  const extensions = [
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    EditorView.lineWrapping,
    petalTheme
  ]

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-1)' }}>
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-2 flex-shrink-0 titlebar-drag"
        style={{ borderBottom: '1px solid var(--border)', height: 44 }}
      >
        {/* Note title */}
        <span
          className="text-sm font-medium truncate max-w-xs titlebar-no-drag"
          style={{ color: 'var(--text)' }}
        >
          {currentNote?.title}
          {isDirty && (
            <span className="ml-2 w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--accent)' }} />
          )}
        </span>

        {/* View toggle + actions */}
        <div className="flex items-center gap-1 titlebar-no-drag">
          {/* Save indicator */}
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
            <ViewButton
              icon={<Edit size={13} />}
              label="Edit"
              mode="edit"
              current={viewMode}
              onChange={setViewMode}
            />
            <ViewButton
              icon={<Columns size={13} />}
              label="Split"
              mode="split"
              current={viewMode}
              onChange={setViewMode}
            />
            <ViewButton
              icon={<Eye size={13} />}
              label="Preview"
              mode="preview"
              current={viewMode}
              onChange={setViewMode}
            />
          </div>
        </div>
      </div>

      {/* CodeMirror */}
      <div className="flex-1 overflow-hidden selectable">
        <CodeMirror
          value={currentContent}
          onChange={onChange}
          extensions={extensions}
          theme={dracula}
          height="100%"
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
            dropCursor: false,
            allowMultipleSelections: false,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: false,
            highlightActiveLine: true,
            highlightSelectionMatches: false,
            searchKeymap: false
          }}
          style={{ height: '100%', fontSize: 14 }}
        />
      </div>
    </div>
  )
}

function ViewButton({
  icon,
  label,
  mode,
  current,
  onChange
}: {
  icon: React.ReactNode
  label: string
  mode: ViewMode
  current: ViewMode
  onChange: (m: ViewMode) => void
}): JSX.Element {
  const isActive = mode === current
  return (
    <button
      onClick={() => onChange(mode)}
      title={label}
      className="flex items-center justify-center w-7 h-6 rounded-md transition-all"
      style={
        isActive
          ? { background: 'var(--accent)', color: '#fff' }
          : { color: 'var(--text-3)' }
      }
    >
      {icon}
    </button>
  )
}
