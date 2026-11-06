import { describe, it, expect } from 'vitest'
import { COUNTRIES, DEFAULT_DIAL_CODE, splitPhoneNumber } from '@/constants/countries'

describe('countries constants', () => {
  it('exposes a canonical, unique ISO list with dial codes', () => {
    expect(COUNTRIES.length).toBeGreaterThan(150)
    expect(new Set(COUNTRIES.map((c) => c.iso2)).size).toBe(COUNTRIES.length)
    expect(COUNTRIES.every((c) => /^\+\d{1,4}$/.test(c.dial))).toBe(true)
    expect(COUNTRIES.find((c) => c.iso2 === 'VN')).toMatchObject({ name: 'Vietnam', dial: '+84' })
  })

  describe('splitPhoneNumber', () => {
    it('splits a known dial code from the national number', () => {
      expect(splitPhoneNumber('+84912345678')).toEqual({ dial: '+84', national: '912345678' })
    })

    it('prefers the longest matching dial code', () => {
      expect(splitPhoneNumber('+18685551234')).toEqual({ dial: '+1868', national: '5551234' })
    })

    it('falls back to the default dial code for local numbers', () => {
      expect(splitPhoneNumber('0912345678')).toEqual({
        dial: DEFAULT_DIAL_CODE,
        national: '0912345678',
      })
    })

    it('handles empty input', () => {
      expect(splitPhoneNumber('')).toEqual({ dial: DEFAULT_DIAL_CODE, national: '' })
    })
  })
})
