import { useEffect, useRef, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { X, Pin, PinOff } from 'lucide-react'

type StickyColor = 'yellow' | 'pink' | 'blue' | 'green' | 'purple'

interface ColorTheme {
  bg: string; header: string; border: string; text: string; muted: string; code: string
}

const COLORS: Record<StickyColor, ColorTheme> = {
  yellow: { bg: '#fef9c3', header: '#fef08a', border: '#fde047', text: '#713f12', muted: '#a16207', code: '#fef08a' },
  pink:   { bg: '#fce7f3', header: '#fbcfe8', border: '#f9a8d4', text: '#831843', muted: '#9d174d', code: '#fbcfe8' },
  blue:   { bg: '#dbeafe', header: '#bfdbfe', border: '#93c5fd', text: '#1e3a8a', muted: '#1d4ed8', code: '#bfdbfe' },
  green:  { bg: '#d1fae5', header: '#a7f3d0', border: '#6ee7b7', text: '#064e3b', muted: '#065f46', code: '#a7f3d0' },
  purple: { bg: '#ede9fe', header: '#ddd6fe', border: '#c4b5fd', text: '#4c1d95', muted: '#5b21b6', code: '#ddd6fe' }
}

interface StickyInit {
  noteId: string; notePath: string; content: string; color: StickyColor; pinned: boolean
}

export default function Sticky(): JSX.Element {
  const [init, setInit] = useState<StickyInit | null>(null)
  const [content, setContent] = useState('')
  const [color, setColor] = useState<StickyColor>('yellow')
  const [pinned, setPinned] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const initRef = useRef<StickyInit | null>(null)

  useEffect(() => {
    window.stickyApi.getInit().then((data: StickyInit) => {
      setInit(data)
      initRef.current = data
      setContent(data.content)
      setColor(data.color)
      setPinned(data.pinned)
      if (!data.content.trim()) setIsEditing(true)
    })
  }, [])

  // Sync from main app save
  useEffect(() => {
    const handler = (incoming: unknown): void => {
      if (!saveTimer.current) setContent(incoming as string)
    }
    window.electron?.ipcRenderer.on('note:content-updated', handler)
    return () => window.electron?.ipcRenderer.off('note:content-updated', handler)
  }, [])

  useEffect(() => {
    if (isEditing) setTimeout(() => textareaRef.current?.focus(), 30)
  }, [isEditing])

  const scheduleSave = useCallback((value: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null
      const current = initRef.current
      if (current) window.stickyApi.saveContent(current.notePath, value)
    }, 600)
  }, [])

  const flushSave = useCallback((value: string) => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null }
    const current = initRef.current
    if (current) window.stickyApi.saveContent(current.notePath, value)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setContent(e.target.value)
    scheduleSave(e.target.value)
  }

  const exitEdit = useCallback(() => {
    setIsEditing(false)
    setContent((c) => { flushSave(c); return c })
  }, [flushSave])

  const handleColorChange = (c: StickyColor): void => {
    setColor(c)
    window.stickyApi.setColor(c)
  }

  const handlePin = (): void => {
    const next = !pinned
    setPinned(next)
    window.stickyApi.setAlwaysOnTop(next)
  }

  const handleClose = (): void => {
    setContent((c) => { flushSave(c); return c })
    window.stickyApi.close()
  }

  if (!init) {
    return <div style={{ width: '100vw', height: '100vh', background: '#fef9c3', borderRadius: 10 }} />
  }

  const theme = COLORS[color]

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', flexDirection: 'column',
      background: theme.bg,
      border: `1.5px solid ${theme.border}`,
      borderRadius: 10, overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)'
    }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="drag-region" style={{
        background: theme.header,
        borderBottom: `1px solid ${theme.border}`,
        padding: '6px 8px',
        display: 'flex', alignItems: 'center', gap: 6,
        flexShrink: 0
      }}>
        {/* Color dots */}
        <div style={{ display: 'flex', gap: 4 }} className="no-drag">
          {(Object.keys(COLORS) as StickyColor[]).map((c) => (
            <button key={c} onClick={() => handleColorChange(c)} style={{
              width: 12, height: 12, borderRadius: '50%',
              background: COLORS[c].border,
              border: c === color ? `2px solid ${COLORS[c].text}` : '1.5px solid rgba(0,0,0,0.15)',
              cursor: 'pointer', padding: 0, flexShrink: 0,
              transform: c === color ? 'scale(1.25)' : 'scale(1)',
              transition: 'transform 0.1s'
            }} />
          ))}
        </div>

        {/* Edit hint */}
        {!isEditing && (
          <span style={{ fontSize: 10, color: theme.muted, opacity: 0.55, letterSpacing: '0.02em' }}>
            click to edit
          </span>
        )}

        <div style={{ flex: 1 }} />

        <button className="no-drag" onClick={handlePin} title={pinned ? 'Unpin' : 'Keep on top'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2,
            color: theme.text, opacity: pinned ? 1 : 0.35, display: 'flex', alignItems: 'center',
            transition: 'opacity 0.15s' }}>
          {pinned ? <Pin size={12} /> : <PinOff size={12} />}
        </button>

        <button className="no-drag" onClick={handleClose} title="Close"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2,
            color: theme.text, opacity: 0.4, display: 'flex', alignItems: 'center' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.4')}>
          <X size={13} />
        </button>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* Edit mode */}
        {isEditing && (
          <textarea ref={textareaRef} value={content} onChange={handleChange}
            onBlur={exitEdit}
            onKeyDown={(e) => { if (e.key === 'Escape') exitEdit() }}
            placeholder="Start writing…"
            className="selectable"
            style={{
              position: 'absolute', inset: 0,
              padding: '10px 12px', fontSize: 13, lineHeight: 1.65,
              color: theme.text, background: 'transparent',
              fontFamily: "'Inter', -apple-system, sans-serif",
              overflowY: 'auto'
            }}
          />
        )}

        {/* Preview mode */}
        {!isEditing && (
          <div onClick={() => setIsEditing(true)} className="selectable"
            style={{ position: 'absolute', inset: 0, padding: '10px 12px',
              overflowY: 'auto', cursor: 'text' }}>
            {content.trim()
              ? <StickyMarkdown content={content} theme={theme} />
              : <span style={{ color: theme.muted, fontSize: 13, opacity: 0.5 }}>Click to write…</span>
            }
          </div>
        )}
      </div>

      {/* Resize corner hint */}
      <div style={{ position: 'absolute', bottom: 3, right: 3, opacity: 0.2, pointerEvents: 'none' }}>
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M9 1L1 9M9 5L5 9" stroke={theme.text} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}

// ── Themed markdown renderer ──────────────────────────────────────────────────

function StickyMarkdown({ content, theme }: { content: string; theme: ColorTheme }): JSX.Element {
  const t = theme
  const base: React.CSSProperties = { color: t.text, fontFamily: "'Inter', -apple-system, sans-serif" }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 style={{ ...base, fontSize: 15, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 style={{ ...base, fontSize: 13.5, fontWeight: 600, margin: '10px 0 4px', lineHeight: 1.3 }}>
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 style={{ ...base, fontSize: 12.5, fontWeight: 600, margin: '8px 0 3px', opacity: 0.8, lineHeight: 1.3 }}>
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p style={{ ...base, fontSize: 13, lineHeight: 1.65, margin: '0 0 5px', opacity: 0.9 }}>
            {children}
          </p>
        ),
        strong: ({ children }) => (
          <strong style={{ color: t.text, fontWeight: 700 }}>{children}</strong>
        ),
        em: ({ children }) => (
          <em style={{ color: t.text, opacity: 0.8 }}>{children}</em>
        ),
        code: ({ children, className }) =>
          className ? (
            <code style={{
              display: 'block', background: t.code, borderRadius: 5,
              padding: '5px 8px', fontSize: 11.5,
              fontFamily: 'Menlo, "Fira Code", monospace',
              color: t.text, margin: '4px 0', overflowX: 'auto', lineHeight: 1.5
            }}>{children}</code>
          ) : (
            <code style={{
              background: t.code, borderRadius: 3, padding: '1px 4px',
              fontSize: 11.5, fontFamily: 'Menlo, "Fira Code", monospace', color: t.text
            }}>{children}</code>
          ),
        pre: ({ children }) => (
          <pre style={{ margin: '4px 0', background: 'transparent' }}>{children}</pre>
        ),
        ul: ({ children }) => (
          <ul style={{ ...base, fontSize: 13, margin: '0 0 5px', paddingLeft: 16, opacity: 0.9 }}>
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol style={{ ...base, fontSize: 13, margin: '0 0 5px', paddingLeft: 16, opacity: 0.9 }}>
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li style={{ marginBottom: 2, lineHeight: 1.55 }}>{children}</li>
        ),
        blockquote: ({ children }) => (
          <blockquote style={{
            borderLeft: `3px solid ${t.border}`, paddingLeft: 8,
            margin: '4px 0', opacity: 0.7, fontStyle: 'italic'
          }}>{children}</blockquote>
        ),
        a: ({ children, href }) => (
          <a href={href} style={{ color: t.muted, textDecoration: 'underline' }}>{children}</a>
        ),
        hr: () => (
          <hr style={{ border: 'none', borderTop: `1px solid ${t.border}`, margin: '8px 0', opacity: 0.5 }} />
        ),
        input: ({ ...props }) => (
          <input {...props} style={{ accentColor: t.muted, marginRight: 4 }} />
        )
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
