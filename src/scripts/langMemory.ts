/**
 * Remembers the language the visitor picks in the header switcher
 * Only an explicit pick is stored: Russian stays the default whatever the browser language is
 */
export const initLangMemory = (storageKey: string): void => {
  document.querySelectorAll<HTMLAnchorElement>('[data-lang-pick]').forEach((link) => {
    link.addEventListener('click', () => {
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
