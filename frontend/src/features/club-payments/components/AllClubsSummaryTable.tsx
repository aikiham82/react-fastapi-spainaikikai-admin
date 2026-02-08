import { useState } from 'react';
import { useClubPaymentsContext } from '../hooks/useClubPaymentsContext';
import { Search, Building2, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);

const getPaymentProgress = (paid: number, total: number) => {
  if (total === 0) return 0;
  return Math.round((paid / total) * 100);
};

const getProgressVariant = (percent: number): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (percent >= 80) return 'default';
  if (percent >= 50) return 'secondary';
  return 'destructive';
};

export const AllClubsSummaryTable = () => {
  const { allClubsSummary, isLoadingAllClubs, allClubsError, selectClub } = useClubPaymentsContext();
  const [searchTerm, setSearchTerm] = useState('');

  if (isLoadingAllClubs) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (allClubsError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error al cargar los datos de pagos</p>
        <p className="text-sm text-gray-600 mt-2">{allClubsError.message}</p>
      </div>
    );
  }

  const clubs = [...(allClubsSummary?.clubs ?? [])].sort((a, b) =>
    a.club_name.localeCompare(b.club_name, 'es')
  );
  const filtered = clubs.filter((c) =>
    c.club_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (clubs.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay clubs</h3>
        <p className="text-gray-600">No se encontraron clubs con datos de pagos</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-600">Total Clubs</p>
          <p className="text-2xl font-bold text-gray-900">{clubs.length}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-600">Total Miembros</p>
          <p className="text-2xl font-bold text-gray-900">{allClubsSummary?.grand_total_members ?? 0}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-600">Total Cobrado</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(allClubsSummary?.grand_total_collected ?? 0)}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-600">Ano</p>
          <p className="text-2xl font-bold text-gray-900">{allClubsSummary?.payment_year}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Buscar club..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((club) => {
          const progress = getPaymentProgress(club.members_with_license, club.total_members);
          return (
            <div
              key={club.club_id}
              role="button"
              tabIndex={0}
              aria-label={`Ver detalle de ${club.club_name}`}
              className="border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => selectClub(club.club_id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectClub(club.club_id); } }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{club.club_name}</h3>
                  <p className="text-sm text-gray-600">{club.total_members} miembros</p>
                </div>
                <Badge variant={getProgressVariant(progress)}>
                  {progress}%
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Licencias: </span>
                  <span className="font-medium">{club.members_with_license}</span>
                </div>
                <div>
                  <span className="text-gray-600">Seguros: </span>
                  <span className="font-medium">{club.members_with_insurance}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm pt-2 border-t">
                <span className="text-gray-600">Total cobrado:</span>
                <span className="font-medium text-gray-900 tabular-nums">{formatCurrency(club.total_collected)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4 font-medium text-gray-900">Club</th>
                <th className="text-center p-4 font-medium text-gray-900">Miembros</th>
                <th className="text-center p-4 font-medium text-gray-900">Con Licencia</th>
                <th className="text-center p-4 font-medium text-gray-900">Con Seguro</th>
                <th className="text-right p-4 font-medium text-gray-900">Total Cobrado</th>
                <th className="text-center p-4 font-medium text-gray-900">Progreso</th>
                <th className="w-10 p-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((club) => {
                const progress = getPaymentProgress(club.members_with_license, club.total_members);
                return (
                  <tr
                    key={club.club_id}
                    tabIndex={0}
                    aria-label={`Ver detalle de ${club.club_name}`}
                    className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => selectClub(club.club_id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectClub(club.club_id); } }}
                  >
                    <td className="p-4">
                      <p className="font-medium text-gray-900">{club.club_name}</p>
                    </td>
                    <td className="p-4 text-center text-gray-700">{club.total_members}</td>
                    <td className="p-4 text-center text-gray-700">
                      {club.members_with_license}/{club.total_members}
                    </td>
                    <td className="p-4 text-center text-gray-700">
                      {club.members_with_insurance}/{club.total_members}
                    </td>
                    <td className="p-4 text-right font-medium text-gray-900 tabular-nums">
                      {formatCurrency(club.total_collected)}
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant={getProgressVariant(progress)}>
                        {progress}%
                      </Badge>
                    </td>
                    <td className="p-4">
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </td>
                  </tr>
                );
              })}
              {/* Totals row */}
              <tr className="bg-gray-100 font-medium">
                <td className="p-4 text-gray-900">Total</td>
                <td className="p-4 text-center text-gray-900">{allClubsSummary?.grand_total_members ?? 0}</td>
                <td className="p-4 text-center text-gray-900">
                  {clubs.reduce((sum, c) => sum + c.members_with_license, 0)}
                </td>
                <td className="p-4 text-center text-gray-900">
                  {clubs.reduce((sum, c) => sum + c.members_with_insurance, 0)}
                </td>
                <td className="p-4 text-right text-gray-900 tabular-nums">
                  {formatCurrency(allClubsSummary?.grand_total_collected ?? 0)}
                </td>
                <td className="p-4"></td>
                <td className="p-4"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
