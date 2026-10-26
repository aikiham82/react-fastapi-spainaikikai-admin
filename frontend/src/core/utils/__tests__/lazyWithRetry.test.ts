import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { importWithRetry } from '../lazyWithRetry'

const page = { default: () => null }
const chunkError = new TypeError('Failed to fetch dynamically imported module')

const failingImport = () => vi.fn().mockRejectedValue(chunkError)
const succeedingImport = () => vi.fn().mockResolvedValue(page)

const loadVersion = (entry: string) => {
  document.head.innerHTML = `<script type="module" src="${entry}"></script>`
}

describe('importWithRetry', () => {
  const reload = vi.fn()

  beforeEach(() => {
    sessionStorage.clear()
    loadVersion('/assets/index-old.js')
    vi.stubGlobal('location', { ...window.location, reload })
  })

  afterEach(() => {
    document.head.innerHTML = ''
    vi.unstubAllGlobals()
  })

  it('resolves the page when the import succeeds', async () => {
    await expect(importWithRetry(succeedingImport())).resolves.toBe(page)
    expect(reload).not.toHaveBeenCalled()
  })

  it('reloads the page on the first failure', () => {
    void importWithRetry(failingImport())

    return vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1))
  })

  it('throws the error when the same version fails again after reloading', async () => {
    void importWithRetry(failingImport())
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1))

    await expect(importWithRetry(failingImport())).rejects.toBe(chunkError)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does not reload again when another import succeeds in the same version', async () => {
    void importWithRetry(failingImport())
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1))

    await importWithRetry(succeedingImport())

    await expect(importWithRetry(failingImport())).rejects.toBe(chunkError)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads again when a newer version fails after a later deploy', async () => {
    void importWithRetry(failingImport())
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1))

    loadVersion('/assets/index-new.js')
    void importWithRetry(failingImport())

    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(2))
  })
})
