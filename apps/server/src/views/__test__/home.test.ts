import { describe, expect, test } from 'bun:test'
import { renderHome } from '../home'

describe('renderHome', () => {
  test('returns English HTML with given props', () => {
    const html = renderHome({
      appName: 'TestApp',
      appEnv: 'dev',
      port: 3000,
      svg: '<svg></svg>',
      locale: 'en',
    })
    expect(html).toContain('TestApp')
    expect(html).toContain('dev')
    expect(html).toContain('3000')
    expect(html).toContain('<svg class="logo"')
    expect(html).toContain('/favicon.ico')
    expect(html).toContain('API Service')
  })

  test('returns Indonesian HTML when locale is id', () => {
    const html = renderHome({
      appName: 'MyApp',
      appEnv: 'staging',
      port: 4000,
      svg: '<svg/>',
      locale: 'id',
    })
    expect(html).toContain('MyApp')
    expect(html).toContain('Layanan API')
    expect(html).toContain('Semua sistem berjalan normal')
    expect(html).toContain('Lingkungan')
  })

  test('returns valid HTML structure', () => {
    const html = renderHome({
      appName: 'X',
      appEnv: 'prod',
      port: 8080,
      svg: '<svg/>',
      locale: 'en',
    })
    expect(html).toStartWith('<!doctype html>')
    expect(html).toContain('</html>')
  })
})
