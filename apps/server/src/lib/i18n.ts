import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const cache = new Map<string, Record<string, string>>()

const SUPPORTED = ['en', 'id'] as const
export type Locale = (typeof SUPPORTED)[number]

function resolve(locale: string) {
  return join(import.meta.dir, '..', '..', 'resources', 'lang', `${locale}.json`)
}

export function isSupported(locale: string): locale is Locale {
  return SUPPORTED.includes(locale as Locale)
}

export function loadLocale(locale: string): Record<string, string> {
  const key = isSupported(locale) ? locale : 'en'
  const cached = cache.get(key)
  if (cached) return cached
  const dict: Record<string, string> = JSON.parse(readFileSync(resolve(key), 'utf-8'))
  cache.set(key, dict)
  return dict
}

export function t(locale: string, key: string, fallback?: string): string {
  const dict = loadLocale(locale)
  return dict[key] ?? fallback ?? key
}

export function detectLocale(header?: string | null): Locale {
  if (!header) return 'en'
  const preferred = header.split(',')[0]?.split('-')[0]?.trim().toLowerCase()
  return isSupported(preferred) ? preferred : 'en'
}

export function clearCache() {
  cache.clear()
}
