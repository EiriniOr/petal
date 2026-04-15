import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useNotesStore } from '../store/notes'

export default function Preview(): JSX.Element {
  const { currentContent, viewMode } = useNotesStore()

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: viewMode === 'split' ? 'var(--bg-0)' : 'var(--bg-1)' }}
    >
      {viewMode === 'split' && (
        <div
          className="flex items-center px-4 flex-shrink-0"
          style={{ height: 44, borderBottom: '1px solid var(--border)' }}
        >
          <span className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--text-3)', fontSize: 10 }}>
            Preview
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto selectable px-8 py-6">
        <div className="max-w-2xl mx-auto prose-petal">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              input: ({ ...props }) => (
                <input {...props} style={{ accentColor: 'var(--accent)' }} />
              )
            }}
          >
            {currentContent}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
