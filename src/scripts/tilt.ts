import { motionAllowed } from './motion'

/** Largest turn of the hero window and of a card under the pointer, in degrees */
const SCENE_TURN = { x: 10, y: 16 }
const CARD_TURN = 7

/** Resting angles of the hero window: it is shown turned, so its layers read as depth even before the pointer moves */
const SCENE_REST = { x: 10, y: -16 }

const finePointer = (): boolean => window.matchMedia('(hover: hover) and (pointer: fine)').matches

/**
 * 3D under the pointer:
 * the hero window turns after the pointer anywhere over its stage, and its floating layers part in depth
 * cards lean towards the pointer and a glare follows it
 * Touch screens and reduced motion keep the resting angle
 */
export const initTilt = (): void => {
  if (!motionAllowed() || !finePointer()) return

  document.querySelectorAll<HTMLElement>('[data-tilt-stage]').forEach((stage) => {
    const scene = stage.querySelector<HTMLElement>('[data-tilt]')
    if (scene === null) return
    let frame = 0
    stage.addEventListener('pointermove', (event) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const box = stage.getBoundingClientRect()
        const px = (event.clientX - box.left) / box.width - 0.5
        const py = (event.clientY - box.top) / box.height - 0.5
        scene.style.setProperty('--rx', `${SCENE_REST.x - py * SCENE_TURN.x}deg`)
        scene.style.setProperty('--ry', `${SCENE_REST.y + px * SCENE_TURN.y * 2}deg`)
      })
    })
    stage.addEventListener('pointerleave', () => {
      cancelAnimationFrame(frame)
      scene.style.removeProperty('--rx')
      scene.style.removeProperty('--ry')
    })
  })

  document.querySelectorAll<HTMLElement>('[data-tilt-card]').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const box = card.getBoundingClientRect()
      const px = (event.clientX - box.left) / box.width
      const py = (event.clientY - box.top) / box.height
      card.style.setProperty('--tx', `${(0.5 - py) * CARD_TURN}deg`)
      card.style.setProperty('--ty', `${(px - 0.5) * CARD_TURN}deg`)
      card.style.setProperty('--mx', `${px * 100}%`)
      card.style.setProperty('--my', `${py * 100}%`)
    })
    card.addEventListener('pointerleave', () => {
      card.style.removeProperty('--tx')
      card.style.removeProperty('--ty')
    })
  })
}
