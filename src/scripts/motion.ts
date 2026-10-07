/** True when the visitor has not asked the system to reduce motion */
export const motionAllowed = (): boolean => !window.matchMedia('(prefers-reduced-motion: reduce)').matches
