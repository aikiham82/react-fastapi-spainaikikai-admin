import { describe, it, expect } from 'vitest'
import { formatFileSize } from '../formatFileSize'

describe('formatFileSize', () => {
  it('shows whole kilobytes under one megabyte', () => {
    expect(formatFileSize(12 * 1024)).toBe('12 KB')
    expect(formatFileSize(100)).toBe('1 KB')
  })

  it('shows megabytes with a Spanish decimal comma', () => {
    expect(formatFileSize(1.2 * 1024 * 1024)).toBe('1,2 MB')
  })

  it('shows 0 KB for an empty file', () => {
    expect(formatFileSize(0)).toBe('0 KB')
  })
})
