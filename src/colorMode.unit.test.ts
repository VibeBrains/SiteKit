import { describe, expect, test } from 'bun:test'
import { colorModeCookie, nextColorMode, readColorMode, resolveColorScheme } from './colorMode'

describe('colorMode', () => {
  test('the switch walks system → light → dark → system', () => {
    expect(nextColorMode('system')).toBe('light')
    expect(nextColorMode('light')).toBe('dark')
    expect(nextColorMode('dark')).toBe('system')
  })

  test('system follows the operating system, the others do not', () => {
    expect(resolveColorScheme('system', true)).toBe('dark')
    expect(resolveColorScheme('system', false)).toBe('light')
    expect(resolveColorScheme('light', true)).toBe('light')
    expect(resolveColorScheme('dark', false)).toBe('dark')
  })

  test('reads the mode among other cookies, unknown values fall back to system', () => {
    expect(readColorMode('a=1; color-mode=dark; b=2', 'color-mode')).toBe('dark')
    expect(readColorMode('color-mode=purple', 'color-mode')).toBe('system')
    expect(readColorMode('', 'color-mode')).toBe('system')
  })

  test('writes a plain value, shared with subdomains only when asked', () => {
    expect(colorModeCookie('light', { cookie: 'color-mode' })).toBe(
      'color-mode=light; path=/; max-age=31536000; samesite=lax',
    )
    expect(colorModeCookie('dark', { cookie: 'color-mode', domain: '.example.com' })).toEndWith(
      'domain=.example.com',
    )
  })
})
