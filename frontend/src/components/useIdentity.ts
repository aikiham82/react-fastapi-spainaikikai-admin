import { useAuthContext } from '@/features/auth/hooks/useAuthContext'
import { roleLabels } from '@/core/utils/roleLabels'

export interface Identity {
  name: string
  email: string
  clubName: string | null
  clubLogoUrl: string | null
  roleLabel: string | null
}

export const useIdentity = (): Identity => {
  const { currentUser, userEmail, userRole } = useAuthContext()
  return {
    name: currentUser?.display_name || userEmail?.split('@')[0] || '',
    email: currentUser?.email ?? userEmail ?? '',
    clubName: currentUser?.club_name ?? null,
    clubLogoUrl: currentUser?.club_logo_url ?? null,
    roleLabel: userRole ? (roleLabels[userRole] ?? null) : null,
  }
}
