import type { UserRole } from '@/features/auth/data/auth.schema'

type SectionId = 'main' | 'activity' | 'admin' | 'account'

interface NavItemDefinition {
  title: string
  path: string
  resource: string
  section: SectionId
  clubAdmin?: { title?: string; section?: SectionId }
}

export interface NavItem {
  title: string
  path: string
}

export interface NavSection {
  id: SectionId
  title: string
  items: NavItem[]
}

type CanRead = (resource: string) => boolean

const NAV_ITEMS: NavItemDefinition[] = [
  { title: 'Inicio', path: '/', resource: 'clubs', section: 'main' },
  { title: 'Miembros', path: '/members', resource: 'members', section: 'main' },
  { title: 'Licencias', path: '/licenses', resource: 'licenses', section: 'main' },
  { title: 'Pagar', path: '/annual-payments', resource: 'payments', section: 'main' },
  { title: 'Estado de pagos', path: '/club-payments', resource: 'payments', section: 'main' },
  { title: 'Seminarios', path: '/seminars', resource: 'seminars', section: 'activity' },
  { title: 'Seguros', path: '/insurance', resource: 'insurance', section: 'activity' },
  { title: 'Facturas', path: '/invoices', resource: 'invoices', section: 'activity' },
  {
    title: 'Clubs',
    path: '/clubs',
    resource: 'clubs',
    section: 'admin',
    clubAdmin: { title: 'Datos del club', section: 'main' },
  },
  { title: 'Precios', path: '/price-configurations', resource: 'price_configurations', section: 'admin' },
  {
    title: 'Importar y exportar',
    path: '/import-export',
    resource: 'import_export',
    section: 'admin',
    clubAdmin: { section: 'activity' },
  },
  { title: 'Configuración', path: '/settings', resource: 'clubs', section: 'account' },
]

const SECTION_ORDER: SectionId[] = ['main', 'activity', 'admin', 'account']

const sectionTitle = (id: SectionId, role: UserRole): string => {
  const titles: Record<SectionId, string> = {
    main: role === 'super_admin' ? 'Gestión' : 'Mi club',
    activity: 'Actividad',
    admin: 'Administración',
    account: 'Cuenta',
  }
  return titles[id]
}

const resolve = (item: NavItemDefinition, role: UserRole) => {
  const override = role === 'club_admin' ? item.clubAdmin : undefined
  return {
    title: override?.title ?? item.title,
    path: item.path,
    section: override?.section ?? item.section,
  }
}

export const getNavSections = (role: UserRole, canRead: CanRead): NavSection[] => {
  const items = NAV_ITEMS.filter((item) => canRead(item.resource)).map((item) => resolve(item, role))

  return SECTION_ORDER.map((id) => ({
    id,
    title: sectionTitle(id, role),
    items: items.filter((item) => item.section === id).map(({ title, path }) => ({ title, path })),
  })).filter((section) => section.items.length > 0)
}

export const isActivePath = (itemPath: string, pathname: string): boolean =>
  itemPath === '/' ? pathname === '/' || pathname === '/home' : pathname === itemPath || pathname.startsWith(`${itemPath}/`)

export const getPageTitle = (pathname: string, role: UserRole): string => {
  const match = NAV_ITEMS.map((item) => resolve(item, role)).find((item) => isActivePath(item.path, pathname))
  return match?.title ?? 'Inicio'
}
