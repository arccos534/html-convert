import { useMemo } from 'react'
import { getFormattedTextHtml } from '../../lib/formattedText'
import { RichTextEditor } from './RichTextEditor'

export interface FormattedTextChange {
  text: string
  html: string
}

/** A small rich text field that keeps a plain text mirror for legacy data. */
export const FormattedTextField = ({
  value,
  html,
  tag = 'p',
  ariaLabel,
  readOnly = false,
  onChange,
}: {
  value: string
  html?: string
  tag?: 'span' | 'p' | 'h2' | 'h3'
  ariaLabel: string
  readOnly?: boolean
  onChange: (text: string, html: string) => void
}) => {
  const content = useMemo(() => getFormattedTextHtml(value, html, tag), [html, tag, value])

  return <div className="formatted-text-field"><RichTextEditor
      value={content}
      ariaLabel={ariaLabel}
      paragraphGap={0}
      trailingParagraph={false}
      readOnly={readOnly}
      requireSelectionForToolbarActions
      onChange={(nextHtml) => {
        const text = new DOMParser().parseFromString(nextHtml, 'text/html').body.textContent || ''
        onChange(text, nextHtml)
      }}
    /></div>
}
