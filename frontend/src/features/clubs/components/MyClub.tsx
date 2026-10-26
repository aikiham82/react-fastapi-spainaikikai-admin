import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { useClubQuery } from '../hooks/queries/useClubQueries';
import { ClubForm } from './ClubForm';

export const MyClub = () => {
  const { clubId } = useAuthContext();
  const { data: club, isLoading, error } = useClubQuery(clubId ?? '');
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) return <p className="text-muted-foreground">Cargando...</p>;
  if (error || !club) {
    return <p className="text-danger">No se pudieron cargar los datos del club.</p>;
  }

  const rows: { label: string; value?: string }[] = [
    { label: 'Nombre', value: club.name },
    { label: 'Dirección', value: club.address },
    { label: 'Ciudad', value: club.city },
    { label: 'Código postal', value: club.postal_code },
    { label: 'Provincia', value: club.province },
    { label: 'Teléfono', value: club.phone },
    { label: 'Correo', value: club.email },
    { label: 'Web', value: club.website },
  ];

  return (
    <div className="max-w-2xl space-y-8">
      <dl className="divide-y divide-border border-y border-border">
        {rows
          .filter((row) => row.label === 'Nombre' || row.value)
          .map((row) => (
            <div key={row.label} className="grid gap-1 py-3 sm:grid-cols-3 sm:items-baseline sm:gap-4">
              <dt className="text-sm text-muted-foreground">{row.label}</dt>
              <dd className="break-words text-foreground sm:col-span-2">{row.value || '-'}</dd>
            </div>
          ))}
      </dl>
      <Button onClick={() => setIsEditing(true)}>Editar datos</Button>
      <ClubForm open={isEditing} onOpenChange={setIsEditing} club={club} />
    </div>
  );
};
