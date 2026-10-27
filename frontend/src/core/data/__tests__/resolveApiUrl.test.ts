import { describe, expect, it } from 'vitest'
import { resolveApiUrl } from '../apiClient'

describe('resolveApiUrl', () => {
  it('prefixes a path on the API server with the API base url', () => {
    expect(resolveApiUrl('/uploads/seminars/1.jpg')).toMatch(/^https?:\/\/[^/]+\/uploads\/seminars\/1\.jpg$/)
  })

  it.each(['//evil.example.com/x', '/\\evil.example.com', '@evil.example.com/x', 'https://evil.example.com/x', 'javascript:alert(1)'])(
    'refuses %s so it cannot point outside the API server',
    (path) => {
      expect(resolveApiUrl(path)).toBe('')
    }
  )
})
