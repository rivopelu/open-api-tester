import { describe, expect, test } from 'bun:test'
import { render, clearCache } from '../template'

describe('template', () => {
  test('render compiles and fills template', () => {
    clearCache()
    const result = render('views/home.html', {
      appName: 'TestApp',
      appEnv: 'staging',
      port: 4000,
      svgLogo: '<svg class="logo"></svg>',
    })
    expect(result).toContain('TestApp')
    expect(result).toContain('staging')
    expect(result).toContain('4000')
    expect(result).toContain('<svg class="logo"')
    expect(result).toContain('</html>')
  })

  test('render caches compiled template', () => {
    clearCache()
    const r1 = render('views/home.html', { appName: 'A', appEnv: 'dev', port: 1, svgLogo: '' })
    const r2 = render('views/home.html', { appName: 'B', appEnv: 'prod', port: 2, svgLogo: '' })
    expect(r1).toContain('A')
    expect(r2).toContain('B')
  })
})
