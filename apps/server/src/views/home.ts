import { render } from '../lib/template'
import { t } from '../lib/i18n'

export function renderHome(opts: {
  appName: string
  appEnv: string
  port: number
  svg: string
  locale: string
}) {
  return render('views/home.html', {
    appName: opts.appName,
    appEnv: opts.appEnv,
    port: opts.port,
    svgLogo: opts.svg.replace('<svg', '<svg class="logo"'),
    subtitle: t(opts.locale, 'app.subtitle'),
    health: t(opts.locale, 'app.health'),
    labelEnv: t(opts.locale, 'app.env'),
    labelPort: t(opts.locale, 'app.port'),
    labelServerTime: t(opts.locale, 'app.server_time'),
    serverTime: new Date().toLocaleString(opts.locale === 'id' ? 'id-ID' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }),
  })
}
