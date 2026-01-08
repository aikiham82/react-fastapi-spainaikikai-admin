import { LicenseProvider } from './features/licenses/hooks/useLicenseContext';
import { LicenseList } from './features/licenses/components/LicenseList';

export const LicensesPage = () => {
  return (
    <LicenseProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Licencias</h1>
          <p className="text-gray-600 mt-1">Gestiona las licencias de la asociación</p>
        </div>
        <LicenseList />
      </div>
    </LicenseProvider>
  );
};
