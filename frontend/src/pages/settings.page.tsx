import { useState } from 'react';
import { User, Bell, Shield, Palette } from 'lucide-react';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

const roleTranslations: Record<string, string> = {
  'association_admin': 'Administrador',
  'club_admin': 'Admin de Club',
};

export const SettingsPage = () => {
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const { currentUser, userRole } = useAuthContext();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuraciones</h1>
        <p className="text-gray-600 mt-1">Gestiona las configuraciones de la aplicación</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              <CardTitle>Perfil de Usuario</CardTitle>
            </div>
            <CardDescription>
              Gestiona tu información de perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Email</Label>
                <p className="text-sm text-gray-900">{currentUser?.email ?? 'No disponible'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Rol</Label>
                <p className="text-sm text-gray-900">{userRole ? (roleTranslations[userRole] || userRole) : 'No disponible'}</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Editar Perfil
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-yellow-600" />
              <CardTitle>Notificaciones</CardTitle>
            </div>
            <CardDescription>
              Configura cómo recibir notificaciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificaciones en la app</Label>
                <p className="text-sm text-gray-500">Recibe notificaciones dentro de la aplicación</p>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alertas por email</Label>
                <p className="text-sm text-gray-500">Recibe alertas importantes por email</p>
              </div>
              <Switch
                checked={emailAlerts}
                onCheckedChange={setEmailAlerts}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-600" />
              <CardTitle>Apariencia</CardTitle>
            </div>
            <CardDescription>
              Personaliza la apariencia de la aplicación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Modo oscuro</Label>
                <p className="text-sm text-gray-500">Activa el tema oscuro de la aplicación</p>
              </div>
              <Switch
                checked={darkMode}
                onCheckedChange={setDarkMode}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              <CardTitle>Seguridad</CardTitle>
            </div>
            <CardDescription>
              Gestiona la seguridad de tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" size="sm">
              Cambiar Contraseña
            </Button>
            <Separator />
            <div>
              <Label className="text-sm font-medium text-gray-700">Última sesión</Label>
              <p className="text-sm text-gray-500">Hace unos minutos desde este dispositivo</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
