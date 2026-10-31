import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as Sentry from '@sentry/react'
import { initSentry, redact, reportApiFailure } from '../sentry'

vi.mock('@sentry/react', () => ({ init: vi.fn(), captureException: vi.fn() }))

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

describe('reportApiFailure', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reports a network failure and a server error with method and path only', () => {
    reportApiFailure({ method: 'post', url: '/api/v1/auth/login?next=%2Fmembers', status: undefined })
    reportApiFailure({ method: 'get', url: '/api/v1/members?club_id=1', status: 502 })

    const calls = vi.mocked(Sentry.captureException).mock.calls
    expect(calls.map(([error]) => (error as Error).message)).toEqual([
      'API POST /api/v1/auth/login failed: network error',
      'API GET /api/v1/members failed: 502',
    ])
    expect(calls[1][1]).toMatchObject({
      tags: { api_method: 'GET', api_path: '/api/v1/members', api_status: '502' },
      fingerprint: ['api-failure', 'GET', '/api/v1/members', '502'],
    })
  })

  it('never sends ids or reset tokens that travel in the path', () => {
    reportApiFailure({ method: 'get', url: '/api/v1/auth/password-reset/validate/Zq3xY_8k2LmN0pQrStUvWxYz123456', status: 502 })
    reportApiFailure({ method: 'get', url: '/api/v1/members/6985f6014dca105b754e6d35/payments', status: 500 })

    const messages = vi.mocked(Sentry.captureException).mock.calls.map(([error]) => (error as Error).message)
    expect(messages).toEqual([
      'API GET /api/v1/auth/password-reset/validate/:id failed: 502',
      'API GET /api/v1/members/:id/payments failed: 500',
    ])
  })

  it('leaves out requests the app cancelled itself', () => {
    reportApiFailure({ method: 'get', url: '/api/v1/members', status: undefined, cancelled: true })

    expect(Sentry.captureException).not.toHaveBeenCalled()
  })

  it('leaves out network failures while the browser knows it is offline', () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

    reportApiFailure({ method: 'get', url: '/api/v1/clubs', status: undefined })
    reportApiFailure({ method: 'get', url: '/api/v1/members', status: 502 })

    const messages = vi.mocked(Sentry.captureException).mock.calls.map(([error]) => (error as Error).message)
    expect(messages).toEqual(['API GET /api/v1/members failed: 502'])
    onLine.mockRestore()
  })

  it('leaves client errors alone, they are answers not failures', () => {
    for (const status of [400, 401, 403, 404, 409, 422]) {
      reportApiFailure({ method: 'get', url: '/api/v1/members', status })
    }

    expect(Sentry.captureException).not.toHaveBeenCalled()
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

  it('hides a reset token that travels in the path of a breadcrumb', () => {
    expect(redact({ url: 'https://api.example.com/api/v1/auth/password-reset/validate/Zq3xY_8k2LmN0pQr' })).toEqual({
      url: 'https://api.example.com/api/v1/auth/password-reset/validate/[token]',
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
