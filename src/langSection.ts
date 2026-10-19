/** A page section with an anchor: its id and the distance of its top edge from the viewport top */
export interface SectionPosition {
  id: string
  top: number
}

/** Share of the viewport height: a section whose top is above this line counts as the one on screen */
export const SECTION_LINE_RATIO = 1 / 3

/**
 * The section the visitor is reading: the last one in page order whose top is above the line
 * The line sits at a third of the viewport, so a section just scrolled to under the sticky header still counts
 * Returns null while no section reached the line (hero, top of the page): the switcher then leads to the page top
 */
export const pickSectionId = (sections: readonly SectionPosition[], viewportHeight: number): string | null => {
  const line = viewportHeight * SECTION_LINE_RATIO
  let picked: string | null = null
  for (const section of sections) {
    if (section.top <= line) picked = section.id
  }
  return picked
}

/** The link target with its hash replaced by the section id; the rest of the address stays as is */
export const withSectionHash = (href: string, id: string): string => `${href.split('#')[0]}#${id}`
