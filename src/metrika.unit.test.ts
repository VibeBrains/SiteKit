import { describe, expect, test } from 'bun:test'
import { isCounterId, isGoalId, metrikaVerdict, parseConsent } from './metrika'

describe('metrikaVerdict', () => {
  test('nothing loads without a counter number, whatever the consent is', () => {
    expect(metrikaVerdict({ counterId: '', consent: 'all' })).toEqual({ load: false, skip: 'no_counter' })
    expect(metrikaVerdict({ counterId: 'abc', consent: 'all' })).toEqual({ load: false, skip: 'no_counter' })
  })

  test('nothing loads without the visitor\'s consent', () => {
    expect(metrikaVerdict({ counterId: '12345678', consent: null })).toEqual({ load: false, skip: 'no_consent' })
    expect(metrikaVerdict({ counterId: '12345678', consent: 'essential' })).toEqual({ load: false, skip: 'no_consent' })
  })

  test('loads with a number and "all"', () => {
    expect(metrikaVerdict({ counterId: '12345678', consent: 'all' })).toEqual({ load: true })
  })
})

describe('parsing', () => {
  test('a cookie value that is not a known choice means "not decided"', () => {
    expect(parseConsent('all')).toBe('all')
    expect(parseConsent('essential')).toBe('essential')
    expect(parseConsent('yes')).toBeNull()
    expect(parseConsent(undefined)).toBeNull()
  })

  test('counter number is digits only', () => {
    expect(isCounterId('113748678')).toBe(true)
    expect(isCounterId('')).toBe(false)
    expect(isCounterId('1 2')).toBe(false)
    expect(isCounterId(undefined)).toBe(false)
  })

  test('goal id is Latin, digits and underscore', () => {
    expect(isGoalId('app_open')).toBe(true)
    expect(isGoalId('App-Open')).toBe(false)
    expect(isGoalId('')).toBe(false)
  })
})
