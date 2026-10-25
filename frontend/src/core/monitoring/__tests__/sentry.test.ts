import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as Sentry from '@sentry/react'
import { initSentry, redact } from '../sentry'

vi.mock('@sentry/react', () => ({ init: vi.fn() }))

describe('initSentry', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does nothing without a DSN', () => {
    expect(initSentry(undefined)).toBe(false)
    expect(Sentry.init).not.toHaveBeenCalled()
  })

  it('reports errors only and collects no personal data', () => {
    expect(initSentry('https://key@example.ingest.sentry.io/1', 'production')).toBe(true)

    const options = vi.mocked(Sentry.init).mock.calls[0][0]!
    expect(options.environment).toBe('production')
    expect(options.tracesSampleRate).toBeUndefined()
    expect(options.integrations).toBeUndefined()
    expect(options.dataCollection).toMatchObject({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
    })
  })
})

describe('redact', () => {
  it('hides emails and password reset tokens wherever they appear', () => {
    const event = {
      message: 'No se pudo dar acceso a ana@example.com',
      request: { url: 'https://admin.example.com/reset-password?token=abc123XYZ_-' },
      breadcrumbs: [{ data: { url: '/api/v1/users?email=luis%40example.com' } }],
    }

    expect(redact(event)).toEqual({
      message: 'No se pudo dar acceso a [email]',
      request: { url: 'https://admin.example.com/reset-password?token=[token]' },
      breadcrumbs: [{ data: { url: '/api/v1/users?email=[email]' } }],
    })
  })

  it('leaves other values as they are', () => {
    expect(redact({ level: 'error', count: 3, ok: true, none: null })).toEqual({
      level: 'error',
      count: 3,
      ok: true,
      none: null,
    })
  })
})
