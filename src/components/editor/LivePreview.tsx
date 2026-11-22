import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ArticleDocument } from '../../types'
import { generateSiteArticlePreviewHtml, generateSiteFeedPreviewHtml } from '../../lib/sitePreview'

interface LivePreviewProps {
  documentData: ArticleDocument
  compact: boolean
}

const DESKTOP_WIDTH = 1024

export const LivePreview = ({ documentData, compact }: LivePreviewProps) => {
  const [screen, setScreen] = useState<'feed' | 'article'>('article')
  const [width, setWidth] = useState<'desktop' | 'mobile'>(compact ? 'mobile' : 'desktop')
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const viewportRef = useRef<HTMLDivElement>(null)
  const focusAfterNavigation = useRef(false)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const lastPage = useRef<{ document: Document; html: string } | null>(null)
  const previewHtml = useMemo(() => screen === 'feed'
    ? generateSiteFeedPreviewHtml(documentData)
    : generateSiteArticlePreviewHtml(documentData), [documentData, screen])

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const observer = new ResizeObserver(([{ contentRect }]) => {
      setViewportSize({ width: contentRect.width, height: contentRect.height })
    })
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  const scale = width === 'desktop' && viewportSize.width > 0
    ? Math.min(1, viewportSize.width / DESKTOP_WIDTH)
    : 1

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
    <section className="live-preview" aria-labelledby="preview-title">
      <header className="live-preview-header">
        <h1 id="preview-title">Предпросмотр сайта</h1>
        <div className="preview-switches">
          <div className="segmented" role="group" aria-label="Страница предпросмотра">
            <button type="button" aria-pressed={screen === 'article'} onClick={() => setScreen('article')}>Статья</button>
            <button type="button" aria-pressed={screen === 'feed'} onClick={() => setScreen('feed')}>Лента</button>
          </div>
          <div className="segmented" role="group" aria-label="Ширина предпросмотра">
            <button type="button" aria-pressed={width === 'desktop'} onClick={() => setWidth('desktop')}>Компьютер</button>
            <button type="button" aria-pressed={width === 'mobile'} onClick={() => setWidth('mobile')}>Телефон</button>
          </div>
        </div>
      </header>
      <div className={`preview-viewport ${width === 'mobile' ? 'preview-mobile' : ''}`} ref={viewportRef}>
        <iframe
          key={screen}
          className="portal-preview-frame"
          title={screen === 'feed' ? 'Лента новостей' : 'Полная новость'}
          srcDoc={previewHtml}
          sandbox="allow-same-origin"
          ref={frameRef}
          style={scale < 1 ? {
            width: DESKTOP_WIDTH,
            height: viewportSize.height / scale,
            flexShrink: 0,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          } : undefined}
        />
      </div>
    </section>
  )
}
