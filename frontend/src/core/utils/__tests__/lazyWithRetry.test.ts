import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { importWithRetry } from '../lazyWithRetry'

const page = { default: () => null }
const chunkError = new TypeError('Failed to fetch dynamically imported module')

const failingImport = () => vi.fn().mockRejectedValue(chunkError)
const succeedingImport = () => vi.fn().mockResolvedValue(page)

describe('importWithRetry', () => {
  const reload = vi.fn()

  beforeEach(() => {
    sessionStorage.clear()
    vi.stubGlobal('location', { ...window.location, reload })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reloads the page on the first failure', () => {
    void importWithRetry(failingImport())

    return vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1))
  })

  it('throws the error on a second consecutive failure', async () => {
    void importWithRetry(failingImport())
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1))

    await expect(importWithRetry(failingImport())).rejects.toBe(chunkError)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads again on a new failure after a successful load', async () => {
    void importWithRetry(failingImport())
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1))

    await expect(importWithRetry(succeedingImport())).resolves.toBe(page)
    void importWithRetry(failingImport())

    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(2))
  })
})
