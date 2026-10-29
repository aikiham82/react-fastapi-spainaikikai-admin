import { useMemo } from 'react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useClubsQuery } from '../hooks/queries/useClubQueries';

interface ClubFilterSelectProps {
  id: string;
  value: string;
  onValueChange: (clubId: string) => void;
}

export const ClubFilterSelect = ({ id, value, onValueChange }: ClubFilterSelectProps) => {
  const { data: clubs } = useClubsQuery({});
  const options = useMemo(() => [
    { value: '', label: 'Todos los clubs' },
    ...(clubs ?? []).map((club) => ({ value: club.id, label: club.name })),
  ], [clubs]);

  return (
    <SearchableSelect
      id={id}
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder="Todos los clubs"
      searchPlaceholder="Buscar club..."
      emptyMessage="No se encontraron clubs."
    />
  );
};
