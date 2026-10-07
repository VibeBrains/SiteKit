import { describe, expect, test } from 'bun:test'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { BASE_LANG, languages, langPaths, type Lang } from './languages'

/*
 * Localisation gate of a family landing:
 * both catalogs carry the same keys and placeholders, strings follow the one-sentence-per-line rule,
 * every key is used, and neither the sources nor the built pages show text that did not come from a catalog
 */

export interface LocaleGateOptions {
  /** Root of the site: `src/` and `dist/` are looked up under it */
  root: string
  /** Every catalog of the site, by language */
  catalogs: Record<Lang, Record<string, string>>
  /** Data that is the same in every language and is not interface text: product names, commands, code */
  data: readonly string[]
  /** Single capital letters are allowed: avatar initials and monograms derived from catalog names */
  singleCapitals?: boolean
}


/** Longest sentence allowed on one line; a longer one must be split into several */
const MAX_SENTENCE = 160


const placeholders = (value: string): string[] => [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort()

const walk = (dir: string, ext: RegExp): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path, ext)
    return ext.test(name) ? [path] : []
  })

const HAS_LETTER = /\p{L}/u

const collapse = (text: string): string => text.replace(/\s+/g, ' ').trim()

const decode = (text: string): string =>
  text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')

const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Removes `{…}` expressions with brace matching, keeping only the literal template around them */
const stripExpressions = (source: string): string => {
  let out = ''
  let depth = 0
  for (const ch of source) {
    if (ch === '{') depth += 1
    else if (ch === '}') depth = Math.max(0, depth - 1)
    else if (depth === 0) out += ch
  }
  return out
}

/** Declares the gate's tests for one site; call it from the site's test file */
export const localeGate = (options: LocaleGateOptions): void => {
  const SRC = join(options.root, 'src')
  const DIST = join(options.root, 'dist')
  const catalogs = options.catalogs
  const baseKeys = Object.keys(catalogs[BASE_LANG]).sort()

  describe('catalogs', () => {
    test('every language has exactly the keys of the base language', () => {
      for (const lang of languages) {
        expect(Object.keys(catalogs[lang]).sort()).toEqual(baseKeys)
      }
    })

    test('no string is empty', () => {
      for (const lang of languages) {
        for (const [key, value] of Object.entries(catalogs[lang])) {
          expect({ lang, key, empty: value.trim() === '' }).toEqual({ lang, key, empty: false })
        }
      }
    })

    test('placeholders match the base language key by key', () => {
      for (const lang of languages) {
        for (const key of baseKeys) {
          expect({ lang, key, names: placeholders(catalogs[lang][key] ?? '') }).toEqual({
            lang,
            key,
            names: placeholders(catalogs[BASE_LANG][key] ?? ''),
          })
        }
      }
    })

    test('one sentence per line, no closing period, no sentence longer than the limit', () => {
      const problems: string[] = []
      for (const lang of languages) {
        for (const [key, value] of Object.entries(catalogs[lang])) {
          for (const line of value.split('\n')) {
            const where = `${lang} ${key}: "${line}"`
            if (line !== line.trim()) problems.push(`${where} has spaces at an edge`)
            if (/\.$/.test(line) && !/\.\.\.$/.test(line)) problems.push(`${where} ends with a period`)
            if (/[.!?]\s+\p{Lu}/u.test(line)) problems.push(`${where} holds two sentences`)
            if (line.length > MAX_SENTENCE) problems.push(`${where} is longer than ${MAX_SENTENCE}`)
          }
        }
      }
      expect(problems).toEqual([])
    })
  })

  describe('sources', () => {
    const sources = walk(SRC, /\.(astro|ts)$/).map((path) => ({ path, text: readFileSync(path, 'utf8') }))

    test('every catalog key is used somewhere in the sources', () => {
      const quoted = new Set<string>()
      for (const { text } of sources) {
        for (const match of text.matchAll(/['"`]([\w.]+)['"`]/g)) quoted.add(match[1] ?? '')
      }
      expect(baseKeys.filter((key) => !quoted.has(key))).toEqual([])
    })

    test('every key passed to t() exists', () => {
      const missing: string[] = []
      for (const { path, text } of sources) {
        for (const match of text.matchAll(/\bt\(\s*'([^']+)'/g)) {
          const key = match[1] ?? ''
          if (!(key in catalogs[BASE_LANG])) missing.push(`${path}: ${key}`)
        }
      }
      expect(missing).toEqual([])
    })

    test('markup has no literal text and no literal accessible names', () => {
      const problems: string[] = []
      for (const { path, text } of sources) {
        if (!path.endsWith('.astro')) continue
        const template = stripExpressions(
          text
            .replace(/^---[\s\S]*?\n---/, '')
            .replace(/<script[\s\S]*?<\/script>/g, '')
            .replace(/<style[\s\S]*?<\/style>/g, '')
            .replace(/<!--[\s\S]*?-->/g, ''),
        )
        for (const match of template.matchAll(/>([^<]+)</g)) {
          const chunk = collapse(match[1] ?? '')
          if (HAS_LETTER.test(chunk)) problems.push(`${path}: text "${chunk}"`)
        }
        for (const match of template.matchAll(/\s(alt|title|aria-label|placeholder)="([^"]*)"/g)) {
          if (HAS_LETTER.test(match[2] ?? '')) problems.push(`${path}: ${match[1]}="${match[2]}"`)
        }
      }
      expect(problems).toEqual([])
    })
  })

  /**
   * A fused line splits its words with markup — one letter of each sits in a plate of its own — and a joined line puts
   * links inside a sentence, so their text nodes are fragments no catalog holds. Each `data-fused` and `data-joined`
   * element is put back as its whole text, which the catalog must hold
   */
  const joinFused = (html: string): string => {
    let out = html
    for (let start = out.search(/<span[^>]*\sdata-(?:fused|joined)[\s>=]/); start >= 0; start = out.search(/<span[^>]*\sdata-(?:fused|joined)[\s>=]/)) {
      const open = out.indexOf('>', start) + 1
      let depth = 1
      let at = open
      while (depth > 0) {
        const next = out.slice(at).search(/<\/?span[\s>]/)
        if (next < 0) throw new Error('an unclosed data-fused element')
        at += next
        depth += out.startsWith('</', at) ? -1 : 1
        at = out.indexOf('>', at) + 1
      }
      const inner = out.slice(open, at - '</span>'.length)
      const text = collapse(decode(inner.replace(/<[^>]+>/g, '')))
      out = `${out.slice(0, start)}<span>${text}</span>${out.slice(at)}`
    }
    return out
  }

  describe('built pages', () => {
    const built = existsSync(DIST)

    test('the site is built before this check', () => {
      expect(built).toBe(true)
    })

    const data = new Set<string>(options.data.map(collapse))

    for (const lang of languages) {
      test(`every visible string of ${langPaths[lang]} comes from the ${lang} catalog`, () => {
        if (!built) return
        const file = join(DIST, langPaths[lang], 'index.html')
        const html = readFileSync(file, 'utf8')
        const allowed = Object.values(catalogs[lang]).flatMap((value) =>
          value.split('\n').map((line) => new RegExp(`^${escapeRegex(collapse(line)).replace(/\\\{\w+\\\}/g, '.+?')}$`, 'u')),
        )
        const fromCatalog = (text: string): boolean =>
          !HAS_LETTER.test(text) ||
          data.has(text) ||
          (options.singleCapitals === true && /^\p{Lu}$/u.test(text)) ||
          allowed.some((pattern) => pattern.test(text))

        const body = joinFused(html)
          .replace(/<script[\s\S]*?<\/script>/g, '')
          .replace(/<style[\s\S]*?<\/style>/g, '')
          .replace(/<!--[\s\S]*?-->/g, '')
        const problems: string[] = []
        for (const match of body.matchAll(/>([^<]+)</g)) {
          const text = collapse(decode(match[1] ?? ''))
          if (!fromCatalog(text)) problems.push(`text "${text}"`)
        }
        for (const match of body.matchAll(/\s(alt|title|aria-label|placeholder|data-text|data-copy|data-copied)="([^"]*)"/g)) {
          const text = collapse(decode(match[2] ?? ''))
          if (!fromCatalog(text)) problems.push(`${match[1]}="${text}"`)
        }
        for (const match of body.matchAll(/<meta (?:name="description"|property="og:(?:title|description)") content="([^"]*)"/g)) {
          const text = collapse(decode(match[1] ?? ''))
          if (!fromCatalog(text)) problems.push(`meta "${text}"`)
        }
        expect(problems).toEqual([])
      })
    }
  })
}
