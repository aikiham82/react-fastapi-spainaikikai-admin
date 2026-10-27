import { useState, type ReactNode } from 'react';
import { Building2, Globe, MapPin, Pencil, Phone, UserCheck, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { useClubQuery } from '../hooks/queries/useClubQueries';
import { useMembersQuery } from '@/features/members/hooks/queries/useMemberQueries';
import type { Club } from '../data/schemas/club.schema';
import { ClubForm } from './ClubForm';

interface DetailRowProps {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}

const DetailRow = ({ icon: Icon, label, children }: DetailRowProps) => (
  <div className="flex items-start gap-3 py-3">
    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground" aria-hidden="true">
      <Icon className="size-[18px]" />
    </span>
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="break-words text-[15px] text-foreground">{children}</dd>
    </div>
  </div>
);

const linkClass = 'underline-offset-4 hover:text-primary hover:underline';

const uniqueParts = (parts: (string | undefined)[]): string[] =>
  parts.filter((part): part is string => Boolean(part)).filter((part, index, all) => all.indexOf(part) === index);

const websiteHref = (website: string): string | undefined => {
  if (/^https?:\/\//i.test(website)) return website;
  if (!website.includes(':')) return `https://${website}`;
  return undefined;
};

const placeLine =(club: Club): string => uniqueParts([club.city, club.province]).join(', ');

export const MyClub = () => {
  const { clubId } = useAuthContext();
  const { data: club, isLoading, error } = useClubQuery(clubId ?? '');
  const { data: members } = useMembersQuery({ club_id: clubId ?? '' }, { enabled: Boolean(clubId) });
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) return <p className="text-muted-foreground">Cargando...</p>;
  if (error || !club) {
    return <p className="text-danger">No se pudieron cargar los datos del club.</p>;
  }

  const place = placeLine(club);
  const addressTail = uniqueParts([club.postal_code, club.city, club.province]);
  const hasAddress = Boolean(club.address) || addressTail.length > 0;
  const responsibles = (members ?? [])
    .filter((member) => member.club_role === 'admin')
    .map((member) => `${member.first_name} ${member.last_name ?? ''}`.trim());

  return (
    <div className="max-w-2xl space-y-4">
      <section className="flex flex-wrap items-center gap-4 rounded-[18px] bg-card p-5 shadow-card">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary" aria-hidden="true">
          <Building2 className="size-8" />
        </span>
        <div className="min-w-0 flex-1 basis-48">
          <h2 className="break-words text-xl font-bold text-foreground">{club.name}</h2>
          {place && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-[18px] shrink-0" aria-hidden="true" />
              <span className="truncate">{place}</span>
            </p>
          )}
        </div>
        <Button onClick={() => setIsEditing(true)} className="min-h-11 w-full sm:w-auto">
          <Pencil className="size-4" aria-hidden="true" />
          Editar datos
        </Button>
      </section>

      <dl className="divide-y divide-border rounded-[18px] bg-card px-5 py-2 shadow-card">
        {responsibles.length > 0 && (
          <DetailRow icon={UserCheck} label={responsibles.length === 1 ? 'Responsable' : 'Responsables'}>
            {responsibles.join(' · ')}
          </DetailRow>
        )}
        {hasAddress && (
          <DetailRow icon={MapPin} label="Dirección">
            {club.address && <span className="block">{club.address}</span>}
            {addressTail.length > 0 && (
              <span className="flex flex-wrap gap-x-1.5 text-muted-foreground">
                {addressTail.map((part) => (
                  <span key={part}>{part}</span>
                ))}
              </span>
            )}
          </DetailRow>
        )}
        {club.phone && (
          <DetailRow icon={Phone} label="Teléfono">
            <a href={`tel:${club.phone}`} className={linkClass}>
              {club.phone}
            </a>
          </DetailRow>
        )}
        {club.website && (
          <DetailRow icon={Globe} label="Web">
            {websiteHref(club.website) ? (
              <a href={websiteHref(club.website)} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {club.website}
              </a>
            ) : (
              club.website
            )}
          </DetailRow>
        )}
      </dl>

      <ClubForm open={isEditing} onOpenChange={setIsEditing} club={club} />
    </div>
  );
};
