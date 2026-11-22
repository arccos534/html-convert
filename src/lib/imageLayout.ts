import type { ImageData } from '../types'

export const getImageLayout = (data: ImageData, hasText: boolean) => {
  const mode = data.textLayout === 'wrap' || data.textLayout === 'stack' ? data.textLayout : 'columns'
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

  return {
    mode, side, align, order, position, maxWidth, width, gap, radius,
    className: `news-image-layout image-mode-${mode} image-side-${side} image-align-${align} image-order-${order} image-position-${position}${hasText ? '' : ' image-alone'}`,
  }
}
