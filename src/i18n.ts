import { BASE_LANG, type Lang } from './languages'

export type Params = Record<string, string | number>

const PLACEHOLDER = /\{(\w+)\}/g

/**
 * Substitutes named placeholders
 * A placeholder without a value stays visible: a bare `{count}` names the bug, silent removal would hide it
 */
export const format = (template: string, params?: Params): string =>
  params === undefined
    ? template
    : template.replace(PLACEHOLDER, (whole, name: string) => (name in params ? String(params[name]) : whole))

/**
 * Translator over the site's catalogs; the site owns the catalogs and the key type, the kit owns the rules
 * A key missing from the language falls back to the base string, so a partial catalog still renders
 * A key missing from the base catalog fails the build instead of shipping an empty label
 */
export const createI18n = <Key extends string>(catalogs: Record<Lang, Partial<Record<Key, string>>>) => {
  const useTranslations = (lang: Lang) => {
    const catalog = catalogs[lang]
    const base = catalogs[BASE_LANG]
    const t = (key: Key, params?: Params): string => {
      const template = catalog[key] ?? base[key]
      if (template === undefined) throw new Error(`i18n: no string for key "${key}"`)
      return format(template, params)
    }
    /** Catalog strings keep one sentence per line: callers render each line as its own element */
    const lines = (key: Key, params?: Params): string[] => t(key, params).split('\n')
    return { t, lines }
  }
  return { useTranslations }
}
