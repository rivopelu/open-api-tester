import { describe, expect, test } from 'bun:test'
import {
  generateId,
  generateRandomPassword,
  generateProfilePicture,
  toTitleCase,
  generateReferralCode,
} from '../string-utils'

describe('string-utils', () => {
  describe('generateId', () => {
    test('returns a 32-char lowercase hex string', () => {
      const id = generateId()
      expect(id).toHaveLength(32)
      expect(id).toMatch(/^[0-9a-f]+$/)
    })

    test('generates unique values', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateId()))
      expect(ids.size).toBeGreaterThan(99)
    })
  })

  describe('generateRandomPassword', () => {
    test('returns default 5-digit numeric string', () => {
      const pw = generateRandomPassword()
      expect(pw).toHaveLength(5)
      expect(pw).toMatch(/^\d{5}$/)
    })

    test('respects custom length', () => {
      expect(generateRandomPassword(8)).toHaveLength(8)
      expect(generateRandomPassword(3)).toHaveLength(3)
    })
  })

  describe('generateProfilePicture', () => {
    test('returns ui-avatars URL with encoded name', () => {
      const url = generateProfilePicture('John Doe')
      expect(url).toBe('https://ui-avatars.com/api/?name=John Doe&background=gray')
    })
  })

  describe('toTitleCase', () => {
    test('capitalizes each word', () => {
      expect(toTitleCase('hello world')).toBe('Hello World')
    })

    test('handles multiple spaces', () => {
      expect(toTitleCase('hello   world')).toBe('Hello World')
    })

    test('handles empty string', () => {
      expect(toTitleCase('')).toBe('')
    })

    test('lowercases extra capitals', () => {
      expect(toTitleCase('HELLO WORLD')).toBe('Hello World')
    })
  })

  describe('generateReferralCode', () => {
    test('returns default 5-char alphanumeric', () => {
      const code = generateReferralCode()
      expect(code).toHaveLength(5)
      expect(code).toMatch(/^[A-Z0-9]+$/)
    })

    test('respects custom length', () => {
      expect(generateReferralCode(10)).toHaveLength(10)
    })
  })
})
