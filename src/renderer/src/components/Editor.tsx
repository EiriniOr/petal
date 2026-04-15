import { useCallback } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { EditorView } from '@codemirror/view'
import { dracula } from '@uiw/codemirror-theme-dracula'
import { useNotesStore } from '../store/notes'

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
  const { currentContent, setContent } = useNotesStore()

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

