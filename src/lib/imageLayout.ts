import type { ImageData, ImagePhoto } from '../types'

export const normalizeAdditionalPhotos = (value: unknown): ImagePhoto[] =>
  Array.isArray(value) ? value.flatMap((photo) => {
    if (typeof photo?.src !== 'string' || !photo.src.trim()) return []
    return [{ src: photo.src.trim(), alt: typeof photo.alt === 'string' ? photo.alt : '' }]
  }) : []

export const getImagePhotos = ({ src, alt, additionalPhotos }: ImageData): ImagePhoto[] => [
  ...(src.trim() ? [{ src, alt }] : []),
  ...(additionalPhotos ?? []),
]

export const getImageLayout = (data: ImageData, hasText: boolean) => {
  const collage = getImagePhotos(data).length > 1
  const mode = data.textLayout === 'columns' ? 'columns'
    : data.textLayout === 'stack' || collage ? 'stack' : data.textLayout === 'wrap' ? 'wrap' : 'columns'
  const side = data.imageSide === 'right' ? 'right' : 'left'
  const align = data.align === 'left' || data.align === 'right' ? data.align : 'center'
  const order = data.stackOrder === 'text-first' ? 'text-first' : 'image-first'
  const position = data.textPosition === 'center' || data.textPosition === 'end' ? data.textPosition : 'start'
  const maxWidth = mode === 'stack' || !hasText ? 100 : 75
  const width = Number.isFinite(data.width) ? Math.max(20, Math.min(maxWidth, data.width)) : Math.min(50, maxWidth)
  const gap = typeof data.textGap === 'number' && Number.isFinite(data.textGap)
    ? Math.max(0, Math.min(48, data.textGap))
    : 24
  const radius = Number.isFinite(data.radius) ? Math.max(0, Math.min(36, data.radius)) : 14
  const grid: NonNullable<ImageData['collageLayout']> = data.collageLayout === 'three' || data.collageLayout === 'lead' ? data.collageLayout : 'two'
  const fit: NonNullable<ImageData['collageFit']> = data.collageFit === 'contain' ? 'contain' : 'cover'

  return {
    mode, side, align, order, position, maxWidth, width, gap, radius,
    collage, grid, fit,
    collageClassName: `image-collage image-collage-${grid} image-fit-${fit}`,
    className: `news-image-layout image-mode-${mode} image-side-${side} image-align-${align} image-order-${order} image-position-${position}${hasText ? '' : ' image-alone'}${collage ? ' image-has-collage' : ''}`,
  }
}
