import { describe, expect, test } from 'bun:test'
import { pickSectionId, withSectionHash } from './langSection'

const sections = [
  { id: 'products', top: -900 },
  { id: 'how', top: -200 },
  { id: 'cases', top: 500 },
  { id: 'contacts', top: 1400 },
]

describe('pickSectionId', () => {
  test('takes the last section whose top is above a third of the viewport', () => {
    expect(pickSectionId(sections, 900)).toBe('how')
    expect(pickSectionId(sections, 1800)).toBe('cases')
  })

  test('a section exactly on the line counts', () => {
    expect(pickSectionId([{ id: 'order', top: 300 }], 900)).toBe('order')
  })

  test('returns null while no section reached the line', () => {
    expect(pickSectionId([{ id: 'products', top: 700 }], 900)).toBeNull()
  })

  test('returns null for a page without anchored sections', () => {
    expect(pickSectionId([], 900)).toBeNull()
  })
})

describe('withSectionHash', () => {
  test('appends the hash to a plain path', () => {
    expect(withSectionHash('/en/', 'cases')).toBe('/en/#cases')
  })

  test('replaces an existing hash', () => {
    expect(withSectionHash('/#hero', 'cases')).toBe('/#cases')
  })
})
