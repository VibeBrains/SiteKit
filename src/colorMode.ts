/**
 * Day and night of a landing that opts in: the visitor's mode, kept in a cookie
 *
 * A cookie, not localStorage: the site's own app on a subdomain reads the same choice, so a visitor who picked the
 * night on the landing finds the cabinet at night too
 * The value is written plain (`color-mode=dark`), the way the start0 pack's cookie store writes it
 */

export const COLOR_MODES = ['system', 'light', 'dark'] as const

export type ColorMode = (typeof COLOR_MODES)[number]

export type ColorScheme = 'light' | 'dark'

/** What a site passes to opt in; without it a landing stays dark only */
export interface ColorModeOptions {
  /** Cookie name; the app on a subdomain reads the same one */
  cookie: string
  /** `.example.com` to share the choice with subdomains; absent keeps the cookie to this host */
  domain?: string
  /** `theme-color` of the browser chrome in each scheme */
  themeColors: Record<ColorScheme, string>
}

/** A year: the choice is a preference, not a session */
const COOKIE_MAX_AGE_S = 60 * 60 * 24 * 365

export const isColorMode = (value: unknown): value is ColorMode =>
  typeof value === 'string' && (COLOR_MODES as readonly string[]).includes(value)

/** The switch walks the modes in a circle: system → light → dark → system */
export const nextColorMode = (mode: ColorMode): ColorMode =>
  COLOR_MODES[(COLOR_MODES.indexOf(mode) + 1) % COLOR_MODES.length] ?? 'system'

export const resolveColorScheme = (mode: ColorMode, systemPrefersDark: boolean): ColorScheme =>
  mode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : mode

/** The mode stored in a `document.cookie` string; anything unknown is `system` */
export const readColorMode = (cookies: string, name: string): ColorMode => {
  for (const part of cookies.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) {
      const value = decodeURIComponent(rest.join('='))
      return isColorMode(value) ? value : 'system'
    }
  }
  return 'system'
}

export const colorModeCookie = (mode: ColorMode, options: Pick<ColorModeOptions, 'cookie' | 'domain'>): string =>
  [
    `${options.cookie}=${mode}`,
    'path=/',
    `max-age=${COOKIE_MAX_AGE_S}`,
    'samesite=lax',
    ...(options.domain === undefined ? [] : [`domain=${options.domain}`]),
  ].join('; ')
