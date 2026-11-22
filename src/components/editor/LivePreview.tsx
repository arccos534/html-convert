import { useEffect, useMemo, useRef, useState } from 'react'
import type { ArticleDocument } from '../../types'
import { generateSiteArticlePreviewHtml, generateSiteFeedPreviewHtml } from '../../lib/sitePreview'

interface LivePreviewProps {
  documentData: ArticleDocument
}

export const LivePreview = ({ documentData }: LivePreviewProps) => {
  const [screen, setScreen] = useState<'feed' | 'article'>('feed')
  const [width, setWidth] = useState<'desktop' | 'mobile'>('desktop')
  const focusAfterNavigation = useRef(false)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const lastPage = useRef<{ document: Document; html: string } | null>(null)
  const previewHtml = useMemo(() => screen === 'feed'
    ? generateSiteFeedPreviewHtml(documentData)
    : generateSiteArticlePreviewHtml(documentData), [documentData, screen])

  useEffect(() => {
    const frame = frameRef.current
    const navigationId = screen === 'feed' ? 'preview-open-article' : 'preview-return-to-feed'
    let animation = 0
    let disconnect: (() => void) | undefined

    const connectNavigation = () => {
      const page = frame?.contentDocument
      const navigation = page?.getElementById(navigationId)
      const previous = lastPage.current
      if (!page || !navigation || (previous?.document === page && previous.html !== previewHtml)) {
        animation = requestAnimationFrame(connectNavigation)
        return
      }
      lastPage.current = { document: page, html: previewHtml }

      // Only these two controls navigate. Draft links stay inactive in the preview.
      const onClick = (event: MouseEvent) => {
        const link = (event.target as Element | null)?.closest?.('a')
        if (!link) return
        event.preventDefault()
        if (link !== navigation) return
        focusAfterNavigation.current = true
        setScreen(screen === 'feed' ? 'article' : 'feed')
      }
      page.addEventListener('click', onClick)
      disconnect = () => page.removeEventListener('click', onClick)

      if (focusAfterNavigation.current) {
        focusAfterNavigation.current = false
        const target = screen === 'article' ? page.getElementById('preview-heading') : navigation
        target?.focus({ preventScroll: true })
      }
    }
    connectNavigation()

    return () => {
      cancelAnimationFrame(animation)
      disconnect?.()
    }
  }, [previewHtml, screen])

  return (
    <section className="live-preview live-preview-full">
      <header className="live-preview-header">
        <div>
          <h2>Предпросмотр сайта</h2>
          <p>{screen === 'feed' ? 'Лента новостей' : 'Полная новость'}</p>
        </div>
        <div className="preview-switches" role="group" aria-label="Ширина предпросмотра">
          <button type="button" aria-pressed={width === 'desktop'} className={width === 'desktop' ? 'is-active' : ''} onClick={() => setWidth('desktop')}>
            Компьютер
          </button>
          <button type="button" aria-pressed={width === 'mobile'} className={width === 'mobile' ? 'is-active' : ''} onClick={() => setWidth('mobile')}>
            Телефон
          </button>
        </div>
      </header>
      <div className={width === 'mobile' ? 'preview-mobile' : undefined}>
        <iframe
          key={screen}
          className="portal-preview-frame"
          title={screen === 'feed' ? 'Лента новостей' : 'Полная новость'}
          srcDoc={previewHtml}
          sandbox="allow-same-origin"
          ref={frameRef}
        />
      </div>
    </section>
  )
}
