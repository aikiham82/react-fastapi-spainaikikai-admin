import { Users, Building2, CreditCard, Calendar, Shield, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const Dashboard = () => {
  const stats = {
    totalClubs: 12,
    totalMembers: 245,
    activeMembers: 198,
    totalPayments: 1205,
    monthlyPayments: 42,
    pendingPayments: 8,
    upcomingSeminars: 3,
    expiringLicenses: 15,
  };

  const recentActivity = [
    { id: 1, type: 'member', message: 'Nuevo miembro registrado', time: 'Hace 2 minutos', user: 'Juan García' },
    { id: 2, type: 'payment', message: 'Pago recibido', time: 'Hace 15 minutos', user: 'María López' },
    { id: 3, type: 'license', message: 'Licencia renovada', time: 'Hace 1 hora', user: 'Pedro Martínez' },
    { id: 4, type: 'seminar', message: 'Inscripción a seminario', time: 'Hace 3 horas', user: 'Ana Sánchez' },
    { id: 5, type: 'member', message: 'Nuevo miembro registrado', time: 'Hace 5 horas', user: 'Carlos Rodríguez' },
  ];

  const upcomingSeminars = [
    {
      id: 1,
      title: 'Seminario de Aikido Avanzado',
      date: '2026-01-15',
      time: '10:00',
      location: 'Dojo Central, Madrid',
      participants: 23,
      maxParticipants: 30,
      price: 45.00,
    },
    {
      id: 2,
      title: 'Taller de Técnicas Básicas',
      date: '2026-01-20',
      time: '09:30',
      location: 'Club Aikido Norte, Bilbao',
      participants: 15,
      maxParticipants: 25,
      price: 25.00,
    },
    {
      id: 3,
      title: 'Seminario con Sensei Nakamura',
      date: '2026-01-28',
      time: '10:00',
      location: 'Dojo Sur, Sevilla',
      participants: 28,
      maxParticipants: 35,
      price: 60.00,
    },
  ];

  const expiringLicenses = [
    { id: 1, member: 'María González', license: 'A-1234', expiryDate: '2026-01-15', days: 7 },
    { id: 2, member: 'José Martínez', license: 'A-5678', expiryDate: '2026-01-18', days: 10 },
    { id: 3, member: 'Ana Fernández', license: 'A-9012', expiryDate: '2026-01-20', days: 12 },
    { id: 4, member: 'Luis Sánchez', license: 'A-3456', expiryDate: '2026-01-22', days: 14 },
    { id: 5, member: 'Carmen Rodríguez', license: 'A-7890', expiryDate: '2026-01-25', days: 17 },
  ];

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Resumen general del sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clubs</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClubs}</div>
            <p className="text-xs text-muted-foreground">+2 este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Miembros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">{stats.activeMembers} activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos del Mes</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.monthlyPayments}</div>
            <p className="text-xs text-muted-foreground">{stats.pendingPayments} pendientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Seminarios Próximos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingSeminars}</div>
            <p className="text-xs text-muted-foreground">Este mes</p>
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
              <div className="space-y-4">
                {recentActivity.map((activity) => (
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Seminarios Próximos</CardTitle>
            </CardHeader>
            <CardContent>
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
                        <span>{seminar.participants}/{seminar.maxParticipants}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
              <div className="space-y-3">
                {expiringLicenses.map((license) => (
                  <div key={license.id} className="border-b last:border-0 pb-3 last:pb-0">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{license.member}</p>
                        <p className="text-xs text-gray-600">{license.license}</p>
                      </div>
                      {getExpiryBadge(license.days)}
                    </div>
                    <div className="text-xs text-gray-600">
                      Expira: {new Date(license.expiryDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Gestionar Miembros
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <CreditCard className="mr-2 h-4 w-4" />
                Ver Pagos
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="mr-2 h-4 w-4" />
                Crear Seminario
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Shield className="mr-2 h-4 w-4" />
                Renovar Licencias
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
