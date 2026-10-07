/** Russian is the base language: compiled in, served at the root and shown by default whatever the browser says */
export const BASE_LANG = 'ru'

export const languages = ['ru', 'en'] as const

export type Lang = (typeof languages)[number]

/** Page path of every language; the base language owns the root */
export const langPaths: Record<Lang, string> = {
  ru: '/',
  en: '/en/',
}

/** Value of the `hreflang` / `lang` attributes */
export const langTags: Record<Lang, string> = {
  ru: 'ru',
  en: 'en',
}
