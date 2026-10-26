import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { useNewVersionNotice } from '../useNewVersionNotice'

vi.mock('sonner', () => ({ toast: vi.fn() }))

const LOADED_ENTRY = '/assets/index-old.js'

const deployedHtml = (entry: string) =>
  `<!doctype html><html><head><script type="module" crossorigin src="${entry}"></script></head><body></body></html>`

const setVisibility = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
}

const becomeVisible = () => {
  setVisibility('visible')
  document.dispatchEvent(new Event('visibilitychange'))
}

const stubDeployedEntry = (entry: string) => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(deployedHtml(entry)))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('useNewVersionNotice', () => {
  beforeEach(() => {
    const script = document.createElement('script')
    script.type = 'module'
    script.setAttribute('src', LOADED_ENTRY)
    document.head.appendChild(script)
  })

  afterEach(() => {
    document.head.innerHTML = ''
    vi.unstubAllGlobals()
  })

  it('shows the notice when the deployed entry script differs', async () => {
    stubDeployedEntry('/assets/index-new.js')
    renderHook(() => useNewVersionNotice())

    becomeVisible()

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        'Hay una nueva versión disponible',
        expect.objectContaining({ id: 'new-version', duration: Infinity }),
      ),
    )
  })

  it('does not show the notice when the deployed entry script is the same', async () => {
    const fetchMock = stubDeployedEntry(LOADED_ENTRY)
    renderHook(() => useNewVersionNotice())

    becomeVisible()

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/index.html', { cache: 'no-store' }))
    expect(toast).not.toHaveBeenCalled()
  })

  it('does not show the notice when the fetch fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)
    renderHook(() => useNewVersionNotice())

    becomeVisible()

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(toast).not.toHaveBeenCalled()
  })

  it('does not show the notice when the deployed page has no entry script', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('<html><body>Bad gateway</body></html>'))
    vi.stubGlobal('fetch', fetchMock)
    renderHook(() => useNewVersionNotice())

    becomeVisible()

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(toast).not.toHaveBeenCalled()
  })

  it('does not check while the tab is hidden', () => {
    const fetchMock = stubDeployedEntry('/assets/index-new.js')
    renderHook(() => useNewVersionNotice())

    setVisibility('hidden')
    document.dispatchEvent(new Event('visibilitychange'))

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reloads the page from the notice action', async () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    stubDeployedEntry('/assets/index-new.js')
    renderHook(() => useNewVersionNotice())

    becomeVisible()

    await waitFor(() => expect(toast).toHaveBeenCalled())
    const options = vi.mocked(toast).mock.calls[0][1] as { action: { label: string; onClick: () => void } }
    expect(options.action.label).toBe('Recargar')
    options.action.onClick()
    expect(reload).toHaveBeenCalled()
  })
})
