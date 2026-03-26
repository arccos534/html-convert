import type { ButtonData } from '../types'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const expandHex = (value: string) => {
  const normalized = value.replace('#', '').trim()
  if (normalized.length === 3) {
    return normalized
      .split('')
      .map((char) => `${char}${char}`)
      .join('')
  }
  return normalized
}

export const applyAlphaToHex = (hex: string, alpha: number) => {
  const normalized = expandHex(hex)
  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    return `rgba(30, 103, 220, ${clamp(alpha, 0, 1)})`
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`
}

export const getButtonPreset = (variant: ButtonData['variant']) => {
  switch (variant) {
    case 'secondary':
      return {
        backgroundColor: '#ebf3ff',
        textColor: '#1d4e99',
        borderColor: '#c5dbff',
        borderWidth: 1,
        radius: 999,
      }
    case 'ghost':
      return {
        backgroundColor: '#ffffff',
        textColor: '#1e67dc',
        borderColor: '#b6d0f6',
        borderWidth: 1,
        radius: 999,
      }
    case 'primary':
    default:
      return {
        backgroundColor: '#1e67dc',
        textColor: '#ffffff',
        borderColor: '#1e67dc',
        borderWidth: 0,
        radius: 999,
      }
  }
}

export const resolveButtonStyle = (data: ButtonData) => {
  const preset = getButtonPreset(data.variant)
  const size = clamp(data.size ?? 100, 70, 180)
  const backgroundOpacity = clamp(data.backgroundOpacity ?? 100, 0, 100)
  const radius = clamp(data.radius ?? preset.radius, 0, 999)
  const borderWidth = clamp(data.borderWidth ?? preset.borderWidth, 0, 8)

  return {
    backgroundColor: applyAlphaToHex(data.backgroundColor ?? preset.backgroundColor, backgroundOpacity / 100),
    textColor: data.textColor ?? preset.textColor,
    borderColor: data.borderColor ?? preset.borderColor,
    borderWidth,
    radius,
    fontSize: Math.round(16 * (size / 100)),
    paddingY: Math.round(10 * (size / 100)),
    paddingX: Math.round(18 * (size / 100)),
  }
}

