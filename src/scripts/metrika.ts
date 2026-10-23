import {
  CONSENT_DAYS,
  DISABLE_KEYS_CLASS,
  GOAL_ATTRIBUTE,
  isGoalId,
  metrikaVerdict,
  parseConsent,
  type ConsentChoice,
} from '../metrika'

/** The official Metrika tag */
const TAG_URL = 'https://mc.yandex.ru/metrika/tag.js'

/** Counter options: click map, links, accurate bounce, Webvisor; landing titles are not personal, so they are sent */
const COUNTER_OPTIONS = {
  clickmap: true,
  trackLinks: true,
  accurateTrackBounce: true,
  webvisor: true,
  sendTitle: true,
} as const

type Ym = ((id: number, method: string, ...args: unknown[]) => void) & { a?: unknown[]; l?: number }

declare global {
  interface Window {
    ym?: Ym
  }
}

let loadedCounter: string | null = null

const readConsent = (cookie: string): ConsentChoice | null => {
  try {
    const part = document.cookie.split(';').find((one) => one.trim().startsWith(`${cookie}=`))
    return parseConsent(part?.split('=')[1]?.trim())
  } catch {
    return null
  }
}

const writeConsent = (cookie: string, choice: ConsentChoice | null): void => {
  try {
    const maxAge = choice === null ? 0 : CONSENT_DAYS * 24 * 60 * 60
    const secure = location.protocol === 'https:' ? '; secure' : ''
    document.cookie = `${cookie}=${choice ?? ''}; path=/; max-age=${maxAge}; samesite=lax${secure}`
  } catch {
    // The decision then lives until the page is reloaded
  }
}

/** Removes the cookies Metrika set on this site: after a refusal the counter must leave no trace */
const purgeMetrikaCookies = (): void => {
  try {
    for (const part of document.cookie.split(';')) {
      const name = part.split('=')[0]?.trim() ?? ''
      if (name.startsWith('_ym')) document.cookie = `${name}=; path=/; max-age=0`
    }
  } catch {
    // The browser refused cookies: nothing to clear
  }
}

/** Marks inputs before the first recording: Webvisor reads the class at the moment of typing */
const guardFields = (): void => {
  for (const field of document.querySelectorAll('input, textarea, [contenteditable]')) field.classList.add(DISABLE_KEYS_CLASS)
}

const loadMetrika = (counterId: string): void => {
  if (loadedCounter !== null) return
  loadedCounter = counterId
  guardFields()
  const stub: Ym = (...args) => {
    ;(stub.a ??= []).push(args)
  }
  const ym = (window.ym ??= stub)
  ym.l = Date.now()
  const script = document.createElement('script')
  script.async = true
  script.src = TAG_URL
  document.head.append(script)
  ym(Number(counterId), 'init', COUNTER_OPTIONS)
}

/** One handler for every call to action marked with `data-goal`; without a loaded Metrika it does nothing */
const onGoalClick = (event: MouseEvent): void => {
  if (loadedCounter === null || !(event.target instanceof Element)) return
  const goal = event.target.closest(`[${GOAL_ATTRIBUTE}]`)?.getAttribute(GOAL_ATTRIBUTE)
  if (isGoalId(goal)) window.ym?.(Number(loadedCounter), 'reachGoal', goal)
}

/**
 * Wires the banner rendered by `components/Metrika.astro`: shows it until the visitor decides, loads the tag only after "all"
 * Without the banner element (no counter number on the site) it does nothing at all
 */
export const initMetrika = (): void => {
  const banner = document.querySelector<HTMLElement>('[data-metrika]')
  if (!banner) return
  const counterId = banner.dataset.counter ?? ''
  const cookie = banner.dataset.cookie ?? ''

  const apply = (): void => {
    const consent = readConsent(cookie)
    banner.hidden = consent !== null
    if (metrikaVerdict({ counterId, consent }).load) {
      loadMetrika(counterId)
    } else if (loadedCounter !== null) {
      // A loaded counter cannot be unloaded: the page restarts without it
      purgeMetrikaCookies()
      location.reload()
    }
  }

  const choose = (choice: ConsentChoice | null): void => {
    writeConsent(cookie, choice)
    apply()
  }

  banner.querySelector('[data-cookie-accept]')?.addEventListener('click', () => choose('all'))
  banner.querySelector('[data-cookie-essential]')?.addEventListener('click', () => choose('essential'))
  for (const link of document.querySelectorAll('[data-cookie-settings]')) {
    link.addEventListener('click', (event) => {
      event.preventDefault()
      choose(null)
    })
  }
  document.addEventListener('click', onGoalClick)
  apply()
}
