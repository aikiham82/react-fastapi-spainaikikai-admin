import {
  CalendarDays,
  CreditCard,
  House,
  Settings,
  ShieldHalf,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole } from '@/features/auth/data/auth.schema'

type GroupId = 'home' | 'club' | 'payments' | 'seminars' | 'admin' | 'settings'

interface TabDefinition {
  title: string
  path: string
  tab?: string
  resource: string
  roles?: Exclude<UserRole, null>[]
}

interface GroupDefinition {
  id: GroupId
  title: string
  icon: LucideIcon
  tabs: TabDefinition[]
  footer?: boolean
  roles?: Exclude<UserRole, null>[]
}

export interface NavTab {
  title: string
  path: string
  tab?: string
  to: string
}

export interface NavGroup {
  id: GroupId
  title: string
  icon: LucideIcon
  tabs: NavTab[]
  to: string
  footer: boolean
}

type CanRead = (resource: string) => boolean

const GROUPS: GroupDefinition[] = [
  { id: 'home', title: 'Inicio', icon: House, tabs: [{ title: 'Inicio', path: '/', resource: 'clubs' }] },
  {
    id: 'club',
    title: 'Club',
    icon: Users,
    tabs: [
      { title: 'Miembros', path: '/members', resource: 'members' },
      { title: 'Licencias', path: '/licenses', resource: 'licenses' },
      { title: 'Seguros', path: '/insurance', resource: 'insurance' },
      { title: 'Datos del club', path: '/clubs', resource: 'clubs', roles: ['club_admin'] },
      { title: 'Importar y exportar', path: '/import-export', resource: 'import_export', roles: ['club_admin'] },
    ],
  },
  {
    id: 'payments',
    title: 'Pagos',
    icon: CreditCard,
    tabs: [
      { title: 'Pendientes', path: '/payments', resource: 'payments' },
      { title: 'Historial', path: '/payments', tab: 'historial', resource: 'payments' },
      { title: 'Facturas', path: '/invoices', resource: 'invoices' },
      { title: 'Precios', path: '/price-configurations', resource: 'price_configurations' },
    ],
  },
  { id: 'seminars', title: 'Seminarios', icon: CalendarDays, tabs: [{ title: 'Seminarios', path: '/seminars', resource: 'seminars' }] },
  {
    id: 'admin',
    title: 'Admin',
    icon: ShieldHalf,
    roles: ['super_admin'],
    tabs: [
      { title: 'Clubs', path: '/clubs', resource: 'clubs' },
      { title: 'Importar y exportar', path: '/import-export', resource: 'import_export' },
    ],
  },
  {
    id: 'settings',
    title: 'Ajustes',
    icon: Settings,
    footer: true,
    tabs: [{ title: 'Configuración', path: '/settings', resource: 'clubs' }],
  },
]

const allows = (roles: Exclude<UserRole, null>[] | undefined, role: UserRole) =>
  !roles || (role !== null && roles.includes(role))

const toOf = ({ path, tab }: { path: string; tab?: string }) => (tab ? `${path}?tab=${tab}` : path)

export const getNavGroups = (role: UserRole, canRead: CanRead): NavGroup[] =>
  GROUPS.filter((group) => allows(group.roles, role))
    .map((group) => {
      const tabs = group.tabs
        .filter((tab) => allows(tab.roles, role) && canRead(tab.resource))
        .map(({ title, path, tab }) => ({ title, path, tab, to: toOf({ path, tab }) }))
      return { id: group.id, title: group.title, icon: group.icon, footer: Boolean(group.footer), tabs, to: tabs[0]?.to ?? '/' }
    })
    .filter((group) => group.tabs.length > 0)

const matchesPath = (path: string, pathname: string) =>
  path === '/' ? pathname === '/' || pathname === '/home' : pathname === path || pathname.startsWith(`${path}/`)

export const isActiveTab = (tab: NavTab, siblings: NavTab[], pathname: string, search: string): boolean => {
  if (!matchesPath(tab.path, pathname)) return false
  const current = new URLSearchParams(search).get('tab')
  if (tab.tab) return current === tab.tab
  return !siblings.some((other) => other.tab && other.path === tab.path && other.tab === current)
}

export const findActiveGroup = (groups: NavGroup[], pathname: string, search: string): NavGroup | undefined =>
  groups.find((group) => group.tabs.some((tab) => isActiveTab(tab, group.tabs, pathname, search)))

export const MOBILE_GROUP_IDS: GroupId[] = ['home', 'club', 'payments', 'seminars']

export const groupCount = (group: NavGroup, counters: Partial<Record<string, number>>): number | undefined => {
  const total = [...new Set(group.tabs.map((tab) => tab.path))].reduce((sum, path) => sum + (counters[path] ?? 0), 0)
  return total > 0 ? total : undefined
}
