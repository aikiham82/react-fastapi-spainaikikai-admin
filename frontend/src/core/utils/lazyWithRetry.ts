import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import { appStorage } from '@/core/data/appStorage'
import { entryScript } from './entryScript'

type PageModule = { default: ComponentType }

const RELOADED_VERSION = 'chunk_reload'

export const importWithRetry = (factory: () => Promise<PageModule>): Promise<PageModule> =>
  factory().catch((error: unknown) => {
    const loadedVersion = entryScript(document)
    if (appStorage().session.get<string>(RELOADED_VERSION) === loadedVersion) throw error
    appStorage().session.set(RELOADED_VERSION, loadedVersion)
    window.location.reload()
    return new Promise<PageModule>(() => {})
  })

export const lazyWithRetry = (factory: () => Promise<PageModule>): LazyExoticComponent<ComponentType> =>
  lazy(() => importWithRetry(factory))
