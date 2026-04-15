export interface NoteMetadata {
  id: string
  title: string
  path: string
  folder: string
  modified: number
  created: number
  preview: string
  tags: string[]
}

export interface FolderInfo {
  name: string
  path: string
  count: number
}

export type ViewMode = 'edit' | 'split' | 'preview'
