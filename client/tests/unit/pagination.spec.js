import { describe, it, expect } from 'vitest'
import { totalPagesFrom, buildPageNumbers, resultRange } from '@/utils/pagination'

describe('pagination utils', () => {
  describe('totalPagesFrom', () => {
    it('rounds up and handles empty/edge inputs', () => {
      expect(totalPagesFrom(0, 20)).toBe(0)
      expect(totalPagesFrom(20, 20)).toBe(1)
      expect(totalPagesFrom(21, 20)).toBe(2)
      expect(totalPagesFrom(45, 20)).toBe(3)
    })

    it('falls back to a limit of 1 for non-positive limits', () => {
      expect(totalPagesFrom(5, 0)).toBe(5)
      expect(totalPagesFrom(5, -1)).toBe(5)
    })
  })

  describe('buildPageNumbers', () => {
    it('returns no pages when there is nothing to page through', () => {
      expect(buildPageNumbers(1, 0)).toEqual([])
      expect(buildPageNumbers(1, 1)).toEqual([1])
    })

    it('lists the pages and an end ellipsis for a five-page range (delta 2)', () => {
      expect(buildPageNumbers(1, 5)).toEqual([1, 2, 3, 'end-ellipsis', 5])
    })

    it('inserts ellipsis markers in the middle of a long range', () => {
      expect(buildPageNumbers(10, 20)).toEqual([
        1,
        'start-ellipsis',
        8,
        9,
        10,
        11,
        12,
        'end-ellipsis',
        20,
      ])
    })

    it('handles the first and last page', () => {
      expect(buildPageNumbers(1, 20)).toEqual([1, 2, 3, 'end-ellipsis', 20])
      expect(buildPageNumbers(20, 20)).toEqual([1, 'start-ellipsis', 18, 19, 20])
    })

    it('clamps an out-of-range current page', () => {
      expect(buildPageNumbers(99, 3)).toEqual([1, 2, 3])
      expect(buildPageNumbers(0, 3)).toEqual([1, 2, 3])
    })
  })

  describe('resultRange', () => {
    it('returns the displayed 1-based index range', () => {
      expect(resultRange(1, 20, 45)).toEqual({ start: 1, end: 20 })
      expect(resultRange(3, 20, 45)).toEqual({ start: 41, end: 45 })
    })

    it('returns zeroes when there is nothing to show', () => {
      expect(resultRange(1, 20, 0)).toEqual({ start: 0, end: 0 })
    })
  })
})
