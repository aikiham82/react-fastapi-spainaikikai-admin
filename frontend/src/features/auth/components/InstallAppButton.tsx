import { useEffect, useState } from 'react'
import { Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface InstallOffer extends Event {
  prompt: () => Promise<void>
}

const HOW_TO_INSTALL = {
  ios: 'En Safari, pulsa el botón Compartir y luego "Añadir a pantalla de inicio".',
  android: 'En Chrome, abre el menú ⋮ y pulsa "Instalar aplicación" o "Añadir a pantalla de inicio".',
}

function mobilePlatform(): keyof typeof HOW_TO_INSTALL | null {
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return 'ios'
  if (/Android/i.test(navigator.userAgent)) return 'android'
  return null
}

export function InstallAppButton() {
  const [offer, setOffer] = useState<InstallOffer | null>(null)
  const [showHowTo, setShowHowTo] = useState(false)
  const platform = mobilePlatform()
  const installed = window.matchMedia('(display-mode: standalone)').matches

  useEffect(() => {
    const keepOffer = (event: Event) => {
      event.preventDefault()
      setOffer(event as InstallOffer)
    }
    window.addEventListener('beforeinstallprompt', keepOffer)
    return () => window.removeEventListener('beforeinstallprompt', keepOffer)
  }, [])

  if (!platform || installed) return null

  const install = () => {
    if (offer) {
      offer.prompt()
      setOffer(null)
    } else {
      setShowHowTo(true)
    }
  }

  return (
    <div className="mt-6 text-center">
      <Button type="button" variant="outline" className="w-full" onClick={install}>
        <Smartphone className="w-4 h-4 mr-2" />
        Instalar en el móvil
      </Button>
      {showHowTo && <p className="mt-3 text-sm text-gray-600">{HOW_TO_INSTALL[platform]}</p>}
    </div>
  )
}
