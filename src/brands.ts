import vibeide from './brands/vibeide.png'
import vibeidea from './brands/vibeidea.svg'
import vibememory from './brands/vibememory.svg'

/** The family's products; names are product names, the same in every language */
export const products = ['vibeide', 'vibeidea', 'vibememory'] as const

export type Product = (typeof products)[number]

export const productNames: Record<Product, string> = {
  vibeide: 'VibeIDE',
  vibeidea: 'VibeIDEA',
  vibememory: 'VibeMemory',
}

/**
 * App icons of the family, as they ship — a redrawn mark drifts from the real one:
 * VibeIDE's from resources/darwin/code.icns of its repository, cropped to the tile
 * VibeIDEA's from vibeidea-customization/resources/vibeidea.svg of its repository
 * VibeMemory's from public/favicon.svg of vibememory.ru
 */
export const brandIcons: Record<Product, string> = {
  vibeide: vibeide.src,
  vibeidea: vibeidea.src,
  vibememory: vibememory.src,
}
