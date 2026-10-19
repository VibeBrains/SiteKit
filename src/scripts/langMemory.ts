import { pickSectionId, withSectionHash, type SectionPosition } from '../langSection'

/** Sections with an anchor: the hero and tight filler sections carry no id and are skipped */
const SECTION_SELECTOR = 'section[id]'

/** Anchored sections in page order with their distance from the viewport top */
const readSections = (): SectionPosition[] =>
  Array.from(document.querySelectorAll<HTMLElement>(SECTION_SELECTOR), (el) => ({
    id: el.id,
    top: el.getBoundingClientRect().top,
  }))

/**
 * Remembers the language the visitor picks in the header switcher
 * Only an explicit pick is stored: Russian stays the default whatever the browser language is
 * Also points the link at the section on screen, so the other language opens at the same place
 */
export const initLangMemory = (storageKey: string): void => {
  document.querySelectorAll<HTMLAnchorElement>('[data-lang-pick]').forEach((link) => {
    const baseHref = link.getAttribute('href')

    // The href is rewritten before the browser follows it, so ctrl/cmd and middle clicks need no special care
    // The page top and a page without a section on screen keep the plain link
    const pointAtSection = (): void => {
      if (baseHref === null) return
      const id = window.scrollY > 0 ? pickSectionId(readSections(), window.innerHeight) : null
      link.setAttribute('href', id === null ? baseHref : withSectionHash(baseHref, id))
    }

    // Middle click and the context menu ("open in new tab", "copy link") do not fire click
    link.addEventListener('auxclick', pointAtSection)
    link.addEventListener('contextmenu', pointAtSection)
    link.addEventListener('click', () => {
      pointAtSection()
      const lang = link.dataset.langPick
      if (lang === undefined) return
      try {
        localStorage.setItem(storageKey, lang)
      } catch {
        // Storage can be blocked: the link still leads to the chosen language
      }
    })
  })
}
