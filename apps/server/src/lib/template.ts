import Handlebars from 'handlebars'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const cache = new Map<string, HandlebarsTemplateDelegate>()

function resolve(...parts: string[]) {
  return join(import.meta.dir, '..', '..', 'resources', ...parts)
}

export function render(templatePath: string, data: Record<string, unknown>): string {
  let tmpl = cache.get(templatePath)
  if (!tmpl) {
    const src = readFileSync(resolve(templatePath), 'utf-8')
    tmpl = Handlebars.compile(src, { noEscape: true })
    cache.set(templatePath, tmpl)
  }
  return tmpl(data)
}

export function clearCache() {
  cache.clear()
}
