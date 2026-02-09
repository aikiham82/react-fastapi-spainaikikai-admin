import { Users, Building2, CreditCard, Calendar, Shield, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useDashboardDataQuery } from '../hooks/queries/useDashboardData.query';
import { usePermissions } from '@/core/hooks/usePermissions';
import type { RecentActivity } from '../data/schemas/dashboard.schema';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useDashboardDataQuery();
  const { canAccess } = usePermissions();

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'member':
        return <Users className="w-4 h-4 text-blue-600" />;
      case 'payment':
        return <CreditCard className="w-4 h-4 text-green-600" />;
      case 'license':
        return <Shield className="w-4 h-4 text-purple-600" />;
      case 'seminar':
        return <Calendar className="w-4 h-4 text-orange-600" />;
      default:
        return <TrendingUp className="w-4 h-4 text-gray-600" />;
    }
  };

  const getExpiryBadge = (days: number) => {
    if (days <= 7) return <Badge variant="destructive">Próximo</Badge>;
    if (days <= 14) return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Pronto</Badge>;
    return <Badge variant="secondary">30 días</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">Error al cargar los datos del dashboard</p>
        <Button onClick={() => window.location.reload()}>Reintentar</Button>
      </div>
    );
  }

  const stats = data?.stats;
  const expiringLicenses = data?.expiring_licenses || [];
  const upcomingSeminars = data?.upcoming_seminars || [];
  const recentActivity = data?.recent_activity || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clubs</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{stats?.total_clubs ?? 0}</div>
            <p className="text-xs text-muted-foreground">Clubs registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Miembros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{stats?.total_members ?? 0}</div>
            <p className="text-xs text-muted-foreground">{stats?.active_members ?? 0} activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{stats?.clubs_paid ?? 0}/{stats?.total_clubs ?? 0}</div>
            <p className="text-xs text-muted-foreground">Clubs al día</p>
            <div className="mt-2 space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
                {stats?.clubs_pending ?? 0} clubs pendientes
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                {stats?.expired_licenses ?? 0} licencias expiradas
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Seminarios Próximos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{stats?.upcoming_seminars ?? 0}</div>
            <p className="text-xs text-muted-foreground">Próximos 30 días</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay actividad reciente
                </p>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity: RecentActivity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="mt-1">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                        <p className="text-xs text-gray-600">{activity.user}</p>
                      </div>
                      <p className="text-xs text-gray-500 whitespace-nowrap">{activity.time}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Seminarios Próximos</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingSeminars.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay seminarios programados
                </p>
              ) : (
                <div className="space-y-4">
                  {upcomingSeminars.map((seminar) => (
                    <div key={seminar.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-gray-900">{seminar.title}</h3>
                          <p className="text-sm text-gray-600">{seminar.location}</p>
                        </div>
                        <Badge variant="outline">{seminar.price.toFixed(2)}€</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(seminar.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} - {seminar.time}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>{seminar.participants}/{seminar.max_participants}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <CardTitle>Licencias Expirando</CardTitle>
            </CardHeader>
            <CardContent>
              {expiringLicenses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay licencias por expirar
                </p>
              ) : (
                <div className="space-y-3">
                  {expiringLicenses.map((license) => (
                    <div key={license.id} className="border-b last:border-0 pb-3 last:pb-0">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{license.member_name}</p>
                          <p className="text-xs text-gray-600">{license.license_number}</p>
                        </div>
                        {getExpiryBadge(license.days_remaining)}
                      </div>
                      <div className="text-xs text-gray-600">
                        Expira: {new Date(license.expiry_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {canAccess({ resource: 'members', action: 'read' }) && (
                <Button className="w-full justify-start" onClick={() => navigate('/members')}>
                  <Users className="mr-2 h-4 w-4" />
                  Gestionar Miembros
                </Button>
              )}
              {canAccess({ resource: 'payments', action: 'read' }) && (
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/club-payments')}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Ver Pagos
                </Button>
              )}
              {canAccess({ resource: 'seminars', action: 'read' }) && (
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/seminars')}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Ver Seminarios
                </Button>
              )}
              {canAccess({ resource: 'licenses', action: 'read' }) && (
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/annual-payments')}>
                  <Shield className="mr-2 h-4 w-4" />
                  Renovar Licencias
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
