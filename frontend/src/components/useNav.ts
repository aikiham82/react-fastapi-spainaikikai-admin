import { useLocation } from 'react-router-dom'
import { useAuthContext } from '@/features/auth/hooks/useAuthContext'
import { usePermissions } from '@/core/hooks/usePermissions'
import { findActiveGroup, getNavGroups } from '@/components/navigation'

export const useNav = () => {
  const { pathname, search } = useLocation()
  const { userRole } = useAuthContext()
  const { canAccess } = usePermissions()
  const groups = getNavGroups(userRole, (resource) => canAccess({ resource, action: 'read' }))
  return { groups, active: findActiveGroup(groups, pathname, search), pathname, search }
}
