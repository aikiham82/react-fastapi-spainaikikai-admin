import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

type PageModule = { default: ComponentType }

const RELOAD_FLAG = 'chunk_reload'

export const importWithRetry = (factory: () => Promise<PageModule>): Promise<PageModule> =>
  factory().then((page) => {
    sessionStorage.removeItem(RELOAD_FLAG)
    return page
  }, (error: unknown) => {
    if (!sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, '1')
      window.location.reload()
      return new Promise<PageModule>(() => {})
    }
    sessionStorage.removeItem(RELOAD_FLAG)
    throw error
  })

export const lazyWithRetry = (factory: () => Promise<PageModule>): LazyExoticComponent<ComponentType> =>
  lazy(() => importWithRetry(factory))
