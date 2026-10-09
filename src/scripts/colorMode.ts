import { colorModeCookie, nextColorMode, readColorMode, resolveColorScheme, type ColorModeOptions } from '../colorMode'

/**
 * The day and night switch of the header
 * The early script of the page shell has already put `data-scheme` on <html>; this one turns the switch, keeps the
 * cookie, follows the system while the mode is `system`, and tells the page's own scripts (a canvas, a chart) that
 * the scheme changed through a `colorschemechange` event on <html>
 */
export const initColorMode = (options: Pick<ColorModeOptions, 'cookie' | 'domain'>): void => {
  const root = document.documentElement
  const system = window.matchMedia('(prefers-color-scheme: dark)')
  const switches = document.querySelectorAll<HTMLButtonElement>('[data-color-mode-switch]')
  let mode = readColorMode(document.cookie, options.cookie)
  // A cookie for a domain the page is not on is dropped by the browser: a local build keeps it to its own host
  const domain =
    options.domain !== undefined && `.${location.hostname}`.endsWith(options.domain) ? options.domain : undefined

  const apply = () => {
    const scheme = resolveColorScheme(mode, system.matches)
    if (root.dataset.scheme !== scheme) {
      root.dataset.scheme = scheme
      root.dispatchEvent(new CustomEvent('colorschemechange', { detail: { scheme } }))
    }
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    const color = meta?.dataset[scheme]
    if (meta !== null && color !== undefined) meta.content = color
    switches.forEach((button) => {
      button.dataset.mode = mode
      button.title = button.dataset[`name${mode.charAt(0).toUpperCase()}${mode.slice(1)}`] ?? ''
    })
  }

  switches.forEach((button) =>
    button.addEventListener('click', () => {
      mode = nextColorMode(mode)
      document.cookie = colorModeCookie(mode, { cookie: options.cookie, domain })
      apply()
    }),
  )
  system.addEventListener('change', apply)
  apply()
}
