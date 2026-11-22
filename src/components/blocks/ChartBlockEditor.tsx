import type { ArticleBlock } from '../../types'
import { chartFileAccept, getChartImageSrc } from '../../lib/chartImport'
import { ImageBlockEditor } from './ImageBlockEditor'
import { RichTextEditor } from './RichTextEditor'
import { ChartMeasurements } from './ChartMeasurements'

type ChartBlock = Extract<ArticleBlock, { type: 'chart' }>

export const ChartBlockEditor = ({ block, selected, editable, onSelect, onChange, onImportChart }: {
  block: ChartBlock
  selected: boolean
  editable: boolean
  onSelect: () => void
  onChange: (block: ArticleBlock) => void
  onImportChart: (id: string, file: File) => Promise<void>
}) => {
  const data = block.data
  return (
    <section className={`content-block chart-block-shell ${data.frameEnabled === false ? 'chart-frame-off' : ''}`}>
      {editable && selected && <label className="chart-import-inline">
        Импорт файла
        <input type="file" accept={chartFileAccept} onChange={async (event) => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          if (file) await onImportChart(block.id, file)
        }} />
      </label>}
      {data.headingEnabled !== false && <RichTextEditor
        value={data.titleHtml || `<h3>${data.title}</h3>`}
        paragraphGap={8} readOnly={!editable || !selected}
        onChange={(titleHtml) => {
          const title = new DOMParser().parseFromString(titleHtml, 'text/html').body.textContent || ''
          onChange({ ...block, data: { ...data, titleHtml, title } })
        }}
      />}
      {data.headingEnabled !== false && data.description && <RichTextEditor
        value={data.descriptionHtml || `<p>${data.description}</p>`}
        paragraphGap={8} readOnly={!editable || !selected}
        onChange={(descriptionHtml) => {
          const description = new DOMParser().parseFromString(descriptionHtml, 'text/html').body.textContent || ''
          onChange({ ...block, data: { ...data, descriptionHtml, description } })
        }}
      />}
      <ImageBlockEditor
        media={editable && selected && !data.imageSrc ? <ChartMeasurements data={data}
          onChange={data => onChange({ ...block, data })} /> : undefined}
        chartMedia block={{ ...block, type: 'image', data: {
          src: getChartImageSrc(data) || '', alt: data.imageAlt || 'Диаграмма', caption: '',
          textHtml: data.textHtml || '', imageSide: data.imageTextSide === 'left' ? 'right' : 'left',
          textLayout: data.textLayout, textGap: data.textGap, textPosition: data.textPosition,
          stackOrder: data.stackOrder, width: data.imageWidth || 100, align: data.align,
          radius: 0, shadow: false, withPadding: false,
        } }}
        selected={selected} editable={editable} onSelect={onSelect}
        onChange={(image) => onChange({ ...block, data: { ...data, textHtml: image.data.textHtml } })}
      />
    </section>
  )
}
