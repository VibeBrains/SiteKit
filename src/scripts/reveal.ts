/** Share of an element that must be on screen before it counts as seen */
const REVEAL_THRESHOLD = 0.15

/** Margin that lets a looping figure start just before it scrolls in and stop once it is gone */
const PLAY_ROOT_MARGIN = '80px 0px'

/**
 * Two observers:
 * `[data-reveal]` gets `is-visible` once, when it first scrolls in
 * `[data-play]` gets `is-playing` while it is on screen, so looping figures do not burn CPU off screen
 */
export const initReveal = (): void => {
  const revealed = document.querySelectorAll<HTMLElement>('[data-reveal]')
  const played = document.querySelectorAll<HTMLElement>('[data-play]')

  if (!('IntersectionObserver' in window)) {
    revealed.forEach((el) => el.classList.add('is-visible'))
    played.forEach((el) => el.classList.add('is-playing'))
    return
  }

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      }
    },
    { threshold: REVEAL_THRESHOLD },
  )
  revealed.forEach((el) => revealObserver.observe(el))

  const playObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        entry.target.classList.toggle('is-playing', entry.isIntersecting)
        entry.target.dispatchEvent(new CustomEvent('playchange', { detail: entry.isIntersecting }))
      }
    },
    { rootMargin: PLAY_ROOT_MARGIN },
  )
  played.forEach((el) => playObserver.observe(el))
}
