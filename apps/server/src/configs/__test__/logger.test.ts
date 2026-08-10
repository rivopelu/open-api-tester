import { describe, expect, test, mock } from 'bun:test'

describe('logger', () => {
  test('exports logger instance', async () => {
    const { logger } = await import('../logger')
    expect(logger).toBeDefined()
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.warn).toBe('function')
  })

  test('logger.info works without error', async () => {
    const { logger } = await import('../logger')
    expect(() => logger.info('test message')).not.toThrow()
  })

  test('exports LoggerStream', async () => {
    const { LoggerStream } = await import('../logger')
    const stream = new LoggerStream()
    expect(typeof stream.write).toBe('function')
  })

  test('LoggerStream.write logs http message', async () => {
    const { LoggerStream, logger } = await import('../logger')
    const spy = mock(() => {})
    const orig = logger.http
    logger.http = spy as any
    const stream = new LoggerStream()
    stream.write('test log line')
    expect(spy).toHaveBeenCalledWith('test log line')
    logger.http = orig
  })

  test('createTransports returns only Console in dev', async () => {
    const { createTransports } = await import('../logger')
    const transports = createTransports('dev', 'debug')
    expect(transports).toHaveLength(1)
    expect(transports[0]).toBeInstanceOf(Object)
  })

  test('createTransports adds File transports in non-dev', async () => {
    const { createTransports } = await import('../logger')
    const transports = createTransports('staging', 'debug')
    expect(transports).toHaveLength(3)
  })

  test('stripAnsi removes ANSI codes', async () => {
    const { stripAnsi } = await import('../logger')
    expect(stripAnsi('\u001b[32minfo\u001b[39m')).toBe('info')
  })

  test('pad pads string to length', async () => {
    const { pad } = await import('../logger')
    expect(pad('test', 8)).toBe('test    ')
    expect(pad('hello', 3)).toBe('hel')
  })

  test('prodFormat is defined', async () => {
    const { prodFormat } = await import('../logger')
    expect(prodFormat).toBeDefined()
    expect(typeof prodFormat).toBe('object')
  })
})
