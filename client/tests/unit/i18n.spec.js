import { describe, it, expect } from 'vitest'
import en from '@/locales/en.json'
import vi from '@/locales/vi.json'

/**
 * Guards against locale drift: every key must exist in both languages with a
 * non-empty value, and no translation should be left as an empty string.
 */
describe('i18n locale files', () => {
  it('have identical key sets (en/vi parity)', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(vi).sort())
  })

  it('have no empty translations', () => {
    for (const [locale, messages] of Object.entries({ en, vi })) {
      for (const [key, value] of Object.entries(messages)) {
        expect(String(value).trim(), `${locale}:${key}`).not.toBe('')
      }
    }
  })
})
