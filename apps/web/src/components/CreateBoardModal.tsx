import { useState } from 'react'
import type { BoardTemplate } from '@group/shared'
import { BOARD_BACKGROUNDS } from '../constants/boardBackgrounds'

interface Props {
  onClose: () => void
  onCreate: (name: string, description?: string, templateId?: string, backgroundColour?: string | null) => Promise<unknown>
  templates: BoardTemplate[]
}

export function CreateBoardModal({ onClose, onCreate, templates }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [backgroundColour, setBackgroundColour] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setError(null)
    setIsSubmitting(true)

    try {
      await onCreate(name.trim(), description.trim() || undefined, templateId || undefined, backgroundColour)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create board')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={isSubmitting ? undefined : onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Create New Board</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Board name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            required
            disabled={isSubmitting}
            autoFocus
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            disabled={isSubmitting}
          />
          {!!templates.length && (
            <div className="template-picker">
              <button
                type="button"
                className={`template-option${templateId === '' ? ' template-option-selected' : ''}`}
                onClick={() => setTemplateId('')}
                disabled={isSubmitting}
              >
                <span>Blank</span>
                <small>Start without columns</small>
              </button>
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={`template-option${templateId === template.id ? ' template-option-selected' : ''}`}
                  onClick={() => setTemplateId(template.id)}
                  disabled={isSubmitting}
                >
                  <span>{template.name}</span>
                  <small>{template.description}</small>
                </button>
              ))}
            </div>
          )}
          <div className="background-picker">
            <button
              type="button"
              className={`background-swatch background-swatch-blank${backgroundColour === null ? ' background-swatch-selected' : ''}`}
              onClick={() => setBackgroundColour(null)}
              disabled={isSubmitting}
              aria-label="Use default background"
            />
            {BOARD_BACKGROUNDS.map((background) => (
              <button
                key={background.name}
                type="button"
                className={`background-swatch${backgroundColour === background.value ? ' background-swatch-selected' : ''}`}
                style={{ background: background.value }}
                onClick={() => setBackgroundColour(background.value)}
                disabled={isSubmitting}
                aria-label={`Use ${background.name} background`}
                title={background.name}
              />
            ))}
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
