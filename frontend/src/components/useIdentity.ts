import { useAuthContext } from '@/features/auth/hooks/useAuthContext'
import { roleLabels } from '@/core/utils/roleLabels'

export interface Identity {
  name: string
  firstName: string
  email: string
  clubName: string | null
  clubTitle: string
  clubLogoUrl: string | null
  roleLabel: string | null
}

export const useIdentity = (): Identity => {
  const { currentUser, userEmail, userRole } = useAuthContext()
  const raw = currentUser?.display_name || userEmail?.split('@')[0] || ''
  const name = raw.charAt(0).toUpperCase() + raw.slice(1)
  return {
    name,
    firstName: name.split(' ')[0],
    email: currentUser?.email ?? userEmail ?? '',
    clubName: currentUser?.club_name ?? null,
    clubTitle: currentUser?.club_name ?? 'Spain Aikikai',
    clubLogoUrl: currentUser?.club_logo_url ?? null,
    roleLabel: userRole ? (roleLabels[userRole] ?? null) : null,
  }
}
