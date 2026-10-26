import { useEffect } from 'react'
import { toast } from 'sonner'

const entryScript = (page: Document): string | null =>
  page.querySelector('script[type="module"][src]')?.getAttribute('src') ?? null

const isNewVersionDeployed = async (): Promise<boolean> => {
  const response = await fetch('/index.html', { cache: 'no-store' })
  if (!response.ok) return false
  const deployedPage = new DOMParser().parseFromString(await response.text(), 'text/html')
  const deployedEntry = entryScript(deployedPage)
  return deployedEntry !== null && deployedEntry !== entryScript(document)
}

const showNewVersionNotice = (): void => {
  toast('Hay una nueva versión disponible', {
    id: 'new-version',
    duration: Infinity,
    action: { label: 'Recargar', onClick: () => window.location.reload() },
  })
}

export const useNewVersionNotice = (): void => {
  useEffect(() => {
    const checkForNewVersion = async () => {
      if (document.visibilityState !== 'visible') return
      const deployed = await isNewVersionDeployed().catch(() => false)
      if (deployed) showNewVersionNotice()
    }
    document.addEventListener('visibilitychange', checkForNewVersion)
    return () => document.removeEventListener('visibilitychange', checkForNewVersion)
  }, [])
}
