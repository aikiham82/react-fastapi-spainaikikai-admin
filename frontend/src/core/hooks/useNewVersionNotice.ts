import { useEffect } from 'react'
import { toast } from 'sonner'
import { entryScript } from '@/core/utils/entryScript'

const isNewVersionDeployed = async (): Promise<boolean> => {
  const response = await fetch(`${import.meta.env.BASE_URL}index.html`, { cache: 'no-store' })
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
    window.addEventListener('focus', checkForNewVersion)
    return () => {
      document.removeEventListener('visibilitychange', checkForNewVersion)
      window.removeEventListener('focus', checkForNewVersion)
    }
  }, [])
}
