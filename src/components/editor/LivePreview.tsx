import { useEffect, useMemo, useState } from 'react'
import type { ArticleDocument } from '../../types'
import { extractPreviewMeta, generateSiteArticlePreviewHtml } from '../../lib/sitePreview'

interface LivePreviewProps {
  documentData: ArticleDocument
}

const feedItems = [
  {
    time: 'Сегодня, вторник, 17:30',
    title: 'Приморцы могут получить грант на реализацию своих социально значимых инициатив',
    image:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
  },
  {
    time: 'Сегодня, вторник, 17:15',
    title: 'В Приморье стартует «Абилимпикс-2026» — чемпионат возможностей для каждого',
    image:
      'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80',
  },
  {
    time: 'Сегодня, вторник, 17:00',
    title: 'Новый цифровой сервис сократил сроки оформления обращений жителей',
    image:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80',
  },
]

const mainNewsItems = [
  {
    time: 'Сегодня, вторник, 14:30',
    title: 'Лучшие практики корпоративного волонтёрства представили в Приморье',
    image:
      'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=900&q=80',
  },
  {
    time: 'Сегодня, вторник, 14:00',
    title: 'Профильные классы в находкинской школе представили Губернатору Приморья',
  },
  {
    time: 'Сегодня, вторник, 11:30',
    title: 'Девять учреждений культуры обновят в Приморье по президентской программе',
  },
]

const formatFeedDate = (updatedAt: string) => {
  const date = new Date(updatedAt)

  if (Number.isNaN(date.getTime())) {
    return 'Сегодня, вторник, 18:00'
  }

  const now = new Date()
  const sameDay =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate()

  const weekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'long' }).format(date)
  const time = new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)

  return `${sameDay ? 'Сегодня' : 'Дата'}${sameDay ? ',' : ':'} ${weekday}, ${time}`
}

export const LivePreview = ({ documentData }: LivePreviewProps) => {
  const [screen, setScreen] = useState<'feed' | 'article'>('feed')

  const meta = useMemo(() => extractPreviewMeta(documentData), [documentData])
  const articleHtml = useMemo(() => generateSiteArticlePreviewHtml(documentData), [documentData])
  const currentFeedTime = useMemo(() => formatFeedDate(documentData.updatedAt), [documentData.updatedAt])

  useEffect(() => {
    setScreen('feed')
  }, [documentData.updatedAt])

  return (
    <section className="live-preview live-preview-full">
      <header className="live-preview-header">
        <div>
          <h2>Предпросмотр сайта</h2>
          <p>Левая колонка повторяет редактируемую ленту, правая колонка остаётся статичной.</p>
        </div>

        <div className="preview-switches">
          <button
            type="button"
            className={screen === 'feed' ? 'is-active' : ''}
            onClick={() => setScreen('feed')}
          >
            Лента
          </button>
          <button
            type="button"
            className={screen === 'article' ? 'is-active' : ''}
            onClick={() => setScreen('article')}
          >
            Статья
          </button>
        </div>
      </header>

      {screen === 'feed' ? (
        <div className="site-preview-frame">
          <div className="site-preview-topline" />

          <div className="site-preview-shell">
            <div className="site-preview-service-nav">
              <span>Документы</span>
              <span>Вакансии</span>
              <span>Противодействие коррупции</span>
              <span>Госуслуги</span>
              <span>Приморский край</span>
              <span>Социальный справочник</span>
            </div>

            <div className="site-preview-brand-row">
              <div className="site-preview-brand">
                <div className="site-preview-badge" />
                <div className="site-preview-brand-text">
                  Правительство
                  <br />
                  Приморского края
                </div>
              </div>

              <nav className="site-preview-main-nav">
                <span>Новости</span>
                <span>Губернатор</span>
                <span>Правительство</span>
                <span>Органы власти</span>
                <span>Приёмная</span>
                <span>Проекты</span>
                <span>Полезная информация</span>
              </nav>
            </div>
          </div>

          <div className="site-preview-breadcrumbs">
            <div className="site-preview-shell">
              <span>Правительство Приморского края</span>
              <span>/</span>
              <span>Новости</span>
            </div>
          </div>

          <div className="site-preview-shell site-preview-feed-layout">
            <section className="site-preview-feed-main">
              <h1>Новости</h1>

              <button
                type="button"
                className="site-preview-feed-item site-preview-feed-item-button"
                onClick={() => setScreen('article')}
              >
                <img src={meta.imageSrc} alt={meta.imageAlt} />
                <div className="site-preview-feed-copy">
                  <p className="site-preview-time">{currentFeedTime}</p>
                  <h2>{meta.title}</h2>
                </div>
              </button>

              {feedItems.map((item) => (
                <article key={item.title} className="site-preview-feed-item">
                  <img src={item.image} alt={item.title} />
                  <div className="site-preview-feed-copy">
                    <p className="site-preview-time">{item.time}</p>
                    <h2>{item.title}</h2>
                  </div>
                </article>
              ))}
            </section>

            <aside className="site-preview-feed-side">
              <h2>Главные новости</h2>

              {mainNewsItems.map((item, index) => (
                <article key={item.title} className="site-preview-side-item">
                  {index === 0 && item.image ? <img src={item.image} alt={item.title} /> : null}
                  <p className="site-preview-side-time">{item.time}</p>
                  <a href="#" onClick={(event) => event.preventDefault()}>
                    {item.title}
                  </a>
                </article>
              ))}
            </aside>
          </div>
        </div>
      ) : (
        <div className="site-preview-article-frame">
          <button type="button" className="preview-back-button" onClick={() => setScreen('feed')}>
            К списку новостей
          </button>
          <iframe title="Предпросмотр статьи" srcDoc={articleHtml} sandbox="" />
        </div>
      )}
    </section>
  )
}
