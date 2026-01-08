import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import type { UserRole } from '@/features/auth/data/auth.schema';

interface PermissionConfig {
  resource: string;
  action: string;
}

const rolePermissions: Record<
  Exclude<UserRole, null>,
  Record<string, string[]>
> = {
  association_admin: {
    clubs: ['read', 'create', 'update', 'delete'],
    members: ['read', 'create', 'update', 'delete'],
    licenses: ['read', 'create', 'update', 'delete'],
    payments: ['read', 'create', 'update', 'delete'],
    seminars: ['read', 'create', 'update', 'delete'],
    insurance: ['read', 'create', 'update', 'delete'],
    import_export: ['read', 'create', 'update', 'delete'],
  },
  club_admin: {
    clubs: ['read'],
    members: ['read', 'create', 'update', 'delete'],
    licenses: ['read', 'create', 'update', 'delete'],
    payments: ['read', 'create', 'update'],
    seminars: ['read', 'create', 'update'],
    insurance: ['read', 'create', 'update'],
    import_export: ['read', 'create', 'update'],
  },
};

export const usePermissions = () => {
  const { userRole, clubId } = useAuthContext();

  const canAccess = ({ resource, action }: PermissionConfig): boolean => {
    if (!userRole) return false;

    const permissions = rolePermissions[userRole];
    if (!permissions) return false;

    const resourcePermissions = permissions[resource];
    if (!resourcePermissions) return false;

    return resourcePermissions.includes(action);
  };

  const canAccessClub = (targetClubId: string): boolean => {
    if (userRole === 'association_admin') return true;
    if (userRole === 'club_admin') return clubId === targetClubId;
    return false;
  };

  const isAssociationAdmin = (): boolean => userRole === 'association_admin';

  const isClubAdmin = (): boolean => userRole === 'club_admin';

  return {
    userRole,
    clubId,
    canAccess,
    canAccessClub,
    isAssociationAdmin,
    isClubAdmin,
  };
};
