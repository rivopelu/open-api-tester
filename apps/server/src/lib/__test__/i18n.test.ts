import { describe, expect, test } from 'bun:test'
import { t, detectLocale, loadLocale, clearCache, isSupported } from '../i18n'

describe('i18n', () => {
  test('isSupported returns true for en and id', () => {
    expect(isSupported('en')).toBe(true)
    expect(isSupported('id')).toBe(true)
    expect(isSupported('fr')).toBe(false)
  })

  test('loadLocale returns en strings', () => {
    clearCache()
    const dict = loadLocale('en')
    expect(dict['app.subtitle']).toBe('API Service')
    expect(dict['app.health']).toBe('All systems operational')
  })

  test('loadLocale returns id strings', () => {
    clearCache()
    const dict = loadLocale('id')
    expect(dict['app.subtitle']).toBe('Layanan API')
    expect(dict['app.health']).toBe('Semua sistem berjalan normal')
  })

  test('loadLocale falls back to en for unsupported locale', () => {
    clearCache()
    const dict = loadLocale('fr')
    expect(dict['app.subtitle']).toBe('API Service')
  })

  test('t returns translated string', () => {
    clearCache()
    expect(t('id', 'app.subtitle')).toBe('Layanan API')
    expect(t('en', 'app.subtitle')).toBe('API Service')
  })

  test('t returns fallback for missing key', () => {
    clearCache()
    expect(t('en', 'missing.key')).toBe('missing.key')
    expect(t('en', 'missing.key', 'Fallback')).toBe('Fallback')
  })

  test('detectLocale parses Accept-Language header', () => {
    expect(detectLocale('id')).toBe('id')
    expect(detectLocale('id-ID')).toBe('id')
    expect(detectLocale('en-US,en;q=0.9')).toBe('en')
    expect(detectLocale('fr-FR,fr;q=0.9')).toBe('en')
    expect(detectLocale(null)).toBe('en')
    expect(detectLocale('')).toBe('en')
  })

  test('loadLocale caches result', () => {
    clearCache()
    const d1 = loadLocale('en')
    const d2 = loadLocale('en')
    expect(d1).toBe(d2)
  })
})
