import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InstallAppButton } from '../InstallAppButton'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36'
const DESKTOP = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36'

function onDevice(userAgent: string, standalone = false) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent)
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: standalone && query === '(display-mode: standalone)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('InstallAppButton', () => {
  it('shows nothing on a desktop browser', () => {
    onDevice(DESKTOP)
    render(<InstallAppButton />)
    expect(screen.queryByRole('button', { name: /instalar en el móvil/i })).not.toBeInTheDocument()
  })

  it('shows nothing once the app is already installed', () => {
    onDevice(ANDROID, true)
    render(<InstallAppButton />)
    expect(screen.queryByRole('button', { name: /instalar en el móvil/i })).not.toBeInTheDocument()
  })

  it('explains how to add it to the home screen on an iPhone', async () => {
    onDevice(IPHONE)
    render(<InstallAppButton />)

    await userEvent.click(screen.getByRole('button', { name: /instalar en el móvil/i }))

    expect(screen.getByText(/añadir a pantalla de inicio/i)).toBeInTheDocument()
  })

  it('opens the browser install prompt on Android when it is offered', async () => {
    onDevice(ANDROID)
    render(<InstallAppButton />)
    const prompt = vi.fn().mockResolvedValue(undefined)
    const offer = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt })
    act(() => {
      window.dispatchEvent(offer)
    })

    await userEvent.click(screen.getByRole('button', { name: /instalar en el móvil/i }))

    expect(prompt).toHaveBeenCalled()
  })

  it('explains the browser menu on Android when no prompt is offered', async () => {
    onDevice(ANDROID)
    render(<InstallAppButton />)

    await userEvent.click(screen.getByRole('button', { name: /instalar en el móvil/i }))

    expect(screen.getByText(/instalar aplicación/i)).toBeInTheDocument()
  })
})
