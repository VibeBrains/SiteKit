/**
 * Yandex Metrika rules of a family landing: pure, no browser and no network
 * They are unit-tested here; `scripts/metrika` executes them in the page
 */

/** Default name of the first-party cookie that keeps the visitor's decision: `all` or `essential` */
export const CONSENT_COOKIE = 'site_cookies'

/** How long the decision lives: a year later the banner asks again */
export const CONSENT_DAYS = 365

export type ConsentChoice = 'all' | 'essential'

/** Anything but the two known values means "not decided" */
export const parseConsent = (raw: string | null | undefined): ConsentChoice | null =>
  raw === 'all' || raw === 'essential' ? raw : null

/** Counter number: digits only; empty means Metrika is off and nothing is rendered or loaded */
export const isCounterId = (value: string | null | undefined): value is string => /^\d{1,12}$/.test(value ?? '')

/** Goal ids are Latin, digits and underscore: they are typed into the Metrika interface as they are */
export const GOAL_ID_PATTERN = /^[a-z][a-z0-9_]{0,63}$/

export const isGoalId = (value: string | null | undefined): value is string => GOAL_ID_PATTERN.test(value ?? '')

/** The attribute that marks a call to action with a goal: `<a data-goal="app_open">` */
export const GOAL_ATTRIBUTE = 'data-goal'

/** Webvisor class that replaces the content of an input with asterisks */
export const DISABLE_KEYS_CLASS = 'ym-disable-keys'

export type MetrikaSkip = 'no_counter' | 'no_consent'

/** Whether to load Metrika now: only with a counter number and the visitor's "all" */
export const metrikaVerdict = (ctx: {
  counterId: string
  consent: ConsentChoice | null
}): { load: true } | { load: false; skip: MetrikaSkip } => {
  if (!isCounterId(ctx.counterId)) return { load: false, skip: 'no_counter' }
  if (ctx.consent !== 'all') return { load: false, skip: 'no_consent' }
  return { load: true }
}

export interface MetrikaTexts {
  title: string
  /** Lines are split by a line break */
  body: string
  policy: string
  accept: string
  essential: string
}

/** Russian by default: a site passes its own catalog strings, in every language it has */
export const DEFAULT_TEXTS: MetrikaTexts = {
  title: 'Cookie и аналитика',
  body: 'Нужные для работы cookie включены всегда\nЯндекс Метрику с записью экрана включаем только с вашего согласия\nВвод в записи скрыт',
  policy: 'Что собирается и как отказаться',
  accept: 'Согласен',
  essential: 'Только необходимые',
}
