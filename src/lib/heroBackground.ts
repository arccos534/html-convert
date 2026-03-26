import type { HeroData } from '../types'

export const heroGradientDirections = [
  { value: 180, label: '↑' },
  { value: 135, label: '↗' },
  { value: 90, label: '→' },
  { value: 45, label: '↘' },
  { value: 0, label: '↓' },
  { value: 315, label: '↙' },
  { value: 270, label: '←' },
  { value: 225, label: '↖' },
] as const

export const createDefaultHeroBackground = () => ({
  enabled: false,
  colorA: '#5cb9bf',
  colorB: '#56b9ca',
  angle: 135,
  stopA: 0,
  stopB: 100,
})

export const buildHeroBackground = (data: HeroData) => {
  if (!data.backgroundEnabled) {
    return 'transparent'
  }

  return `linear-gradient(${data.backgroundAngle}deg, ${data.backgroundColorA} ${data.backgroundStopA}%, ${data.backgroundColorB} ${data.backgroundStopB}%)`
}

export const getHeroTextColor = (data: HeroData) => {
  if (!data.backgroundEnabled && (!data.textColor || data.textColor.toLowerCase() === '#ffffff')) {
    return '#1b2438'
  }

  return data.textColor
}
