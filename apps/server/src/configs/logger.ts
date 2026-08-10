import winston from 'winston'
import { env } from './env'

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
}

winston.addColors(colors)

const ansiPattern = new RegExp(
  '[\\u001b\\u009b][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))',
  'g',
)
export const stripAnsi = (s: string) => String(s).replace(ansiPattern, '')

export const pad = (s: string, n = 7) => s.padEnd(n).slice(0, n)

export const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }: Record<string, unknown>) => {
    const tag = pad(`[${stripAnsi(level as string)}]`)
    const ts = timestamp as string
    const m = meta as Record<string, string>

    if (m.requestId) {
      const ip = m.ip === 'unknown' ? '' : m.ip
      const user = m.user ? `[${m.user}]` : ''
      const ua = m.userAgent
        ? m.userAgent.length > 60
          ? m.userAgent.slice(0, 57) + '...'
          : m.userAgent
        : ''
      const ref = m.referer ?? ''
      return [
        `${ts} ${tag} ${message} ${user}`,
        `  ├─ ${m.requestId}${ip ? ` · ${ip}` : ''}`,
        ua || ref ? `  └─ ${ua}${ref ? ` · ref: ${ref}` : ''}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    }

    const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
    return `${ts} ${tag} ${message}${rest}`
  }),
)

export const prodFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
)

export function createTransports(appEnv: string, logLevel: string): winston.transport[] {
  const transports: winston.transport[] = [
    new winston.transports.Console({
      level: logLevel,
      format: appEnv === 'production' ? prodFormat : devFormat,
    }),
  ]

  if (appEnv !== 'dev') {
    transports.push(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: prodFormat,
        maxsize: 10 * 1024 * 1024,
        maxFiles: 10,
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: prodFormat,
        maxsize: 10 * 1024 * 1024,
        maxFiles: 10,
      }),
    )
  }

  return transports
}

const transports = createTransports(env.APP_ENV, env.LOG_LEVEL)

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  levels,
  transports,
  exitOnError: false,
})

export class LoggerStream {
  constructor() {}

  write(message: string) {
    logger.http(message.trim())
  }
}
