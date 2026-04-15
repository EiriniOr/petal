import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Pin, PinOff } from 'lucide-react'

type StickyColor = 'yellow' | 'pink' | 'blue' | 'green' | 'purple'

const COLORS: Record<StickyColor, { bg: string; header: string; border: string; text: string; placeholder: string }> = {
  yellow: {
    bg: '#fef9c3',
    header: '#fef08a',
    border: '#fde047',
    text: '#713f12',
    placeholder: '#a16207'
  },
  pink: {
    bg: '#fce7f3',
    header: '#fbcfe8',
    border: '#f9a8d4',
    text: '#831843',
    placeholder: '#9d174d'
  },
  blue: {
    bg: '#dbeafe',
    header: '#bfdbfe',
    border: '#93c5fd',
    text: '#1e3a8a',
    placeholder: '#1d4ed8'
  },
  green: {
    bg: '#d1fae5',
    header: '#a7f3d0',
    border: '#6ee7b7',
    text: '#064e3b',
    placeholder: '#065f46'
  },
  purple: {
    bg: '#ede9fe',
    header: '#ddd6fe',
    border: '#c4b5fd',
    text: '#4c1d95',
    placeholder: '#5b21b6'
  }
}

interface StickyInit {
  noteId: string
  notePath: string
  content: string
  color: StickyColor
  pinned: boolean
}

export default function Sticky(): JSX.Element {
  const [init, setInit] = useState<StickyInit | null>(null)
  const [content, setContent] = useState('')
  const [color, setColor] = useState<StickyColor>('yellow')
  const [pinned, setPinned] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Receive init data from main process
  useEffect(() => {
    window.stickyApi.getInit().then((data: StickyInit) => {
      setInit(data)
      setContent(data.content)
      setColor(data.color)
      setPinned(data.pinned)
    })
  }, [])

  // Focus textarea on load
  useEffect(() => {
    if (init) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [init])

  // Sync when main app saves this note
  useEffect(() => {
    const handler = (incoming: unknown): void => {
      // Only update if we're not actively typing (saveTimer is idle)
      if (!saveTimer.current) {
        setContent(incoming as string)
      }
    }
    window.electron?.ipcRenderer.on('note:content-updated', handler)
    return () => window.electron?.ipcRenderer.off('note:content-updated', handler)
  }, [])

  const saveContent = useCallback(
    (value: string) => {
      if (!init) return
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        window.stickyApi.saveContent(init.notePath, value)
      }, 600)
    },
    [init]
  )

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setContent(e.target.value)
    saveContent(e.target.value)
  }

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
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (init) window.stickyApi.saveContent(init.notePath, content)
    window.stickyApi.close()
  }

  if (!init) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          background: '#fef9c3',
          borderRadius: 10
        }}
      />
    )
  }

  const theme = COLORS[color]

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: theme.bg,
        border: `1.5px solid ${theme.border}`,
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12)'
      }}
    >
      {/* Header / drag region */}
      <div
        className="drag-region"
        style={{
          background: theme.header,
          borderBottom: `1px solid ${theme.border}`,
          padding: '6px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0
        }}
      >
        {/* Color dots */}
        <div style={{ display: 'flex', gap: 4 }} className="no-drag">
          {(Object.keys(COLORS) as StickyColor[]).map((c) => (
            <button
              key={c}
              onClick={() => handleColorChange(c)}
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: COLORS[c].border,
                border: c === color ? `2px solid ${COLORS[c].text}` : '1.5px solid rgba(0,0,0,0.15)',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
                transition: 'transform 0.1s',
                transform: c === color ? 'scale(1.2)' : 'scale(1)'
              }}
            />
          ))}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Pin toggle */}
        <button
          className="no-drag"
          onClick={handlePin}
          title={pinned ? 'Unpin from top' : 'Pin on top'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 2,
            color: theme.text,
            opacity: pinned ? 1 : 0.4,
            display: 'flex',
            alignItems: 'center',
            transition: 'opacity 0.15s'
          }}
        >
          {pinned ? <Pin size={12} /> : <PinOff size={12} />}
        </button>

        {/* Close */}
        <button
          className="no-drag"
          onClick={handleClose}
          title="Close sticky"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 2,
            color: theme.text,
            opacity: 0.5,
            display: 'flex',
            alignItems: 'center',
            transition: 'opacity 0.15s'
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.5')}
        >
          <X size={13} />
        </button>
      </div>

      {/* Content area */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleContentChange}
        placeholder="Start writing..."
        className="selectable"
        style={{
          flex: 1,
          padding: '10px 12px',
          fontSize: 13,
          lineHeight: 1.6,
          color: theme.text,
          background: 'transparent',
          fontFamily: "'Inter', -apple-system, sans-serif",
          overflowY: 'auto'
        }}
      />

      {/* Resize handle (bottom-right corner visual cue) */}
      <div
        style={{
          position: 'absolute',
          bottom: 3,
          right: 3,
          width: 10,
          height: 10,
          opacity: 0.3,
          pointerEvents: 'none'
        }}
      >
        <svg viewBox="0 0 10 10" fill={theme.text}>
          <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke={theme.text} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}
