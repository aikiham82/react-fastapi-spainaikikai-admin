import { useEffect, useState } from 'react';
import { Download, IdCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BeltBadge } from '@/components/ui/graphic';
import { StatusBadge } from '@/components/ui/status-badge';
import { daysUntil } from '@/core/utils/expiry';
import { formatDate } from '@/core/utils/format';
import type { License } from '../data/schemas/license.schema';
import { useLicenseImageQuery } from '../hooks/queries/useLicenseQueries';
import { cardTitle, holdsOnlyATitle, pickCardLicence } from '../utils/cardLicence';
import { getStatusPresentation } from '../utils/licenseStatus';
import { saveCardImage } from '../utils/saveCardImage';

const useObjectUrl = (blob: Blob | undefined): string | null => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) return;
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  return blob ? url : null;
};

const CardImage = ({ license }: { license: License }) => {
  const { data, isLoading, isError, refetch } = useLicenseImageQuery(license.id);
  const url = useObjectUrl(data);

  if (isError) {
    return (
      <div className="flex aspect-[1.586] flex-col items-center justify-center gap-3 rounded-[18px] bg-muted p-5 text-center">
        <p className="text-[15px] text-muted-foreground">No se pudo cargar la imagen</p>
        <Button variant="outline" onClick={() => refetch()}>Reintentar</Button>
      </div>
    );
  }

  if (isLoading || !url) {
    return (
      <div className="flex aspect-[1.586] items-center justify-center rounded-[18px] bg-muted">
        <Loader2 className="size-8 animate-spin text-primary" aria-label="Cargando carné" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={`Carné de ${license.member_name || 'socio'}`}
      className="aspect-[1.586] w-full rounded-[18px] object-contain shadow-card"
    />
  );
};

const DownloadCard = ({ license }: { license: License }) => {
  const { data } = useLicenseImageQuery(license.id);

  return (
    <Button
      variant="outline"
      size="lg"
      className="w-full"
      disabled={!data}
      onClick={() => data && saveCardImage(data, `carne-${license.license_number}.png`)}
    >
      <Download className="mr-2 size-4" aria-hidden="true" />
      Descargar
    </Button>
  );
};

const Detail = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex min-h-11 items-center justify-between gap-4 py-2">
    <dt className="text-[15px] text-muted-foreground">{label}</dt>
    <dd className="text-right text-[15px] font-medium text-foreground">{children}</dd>
  </div>
);

interface MemberCardProps {
  licenses: License[];
  now?: Date;
}

export const MemberCard = ({ licenses, now = new Date() }: MemberCardProps) => {
  const license = pickCardLicence(licenses, now);

  if (!license) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[18px] bg-card p-8 text-center shadow-card">
        <IdCard className="size-10 text-muted-foreground" aria-hidden="true" />
        <p className="text-lg font-semibold text-foreground">Sin licencia vigente</p>
        <p className="text-[15px] text-muted-foreground">Pregunta a tu club.</p>
      </div>
    );
  }

  const { tone, label, icon } = getStatusPresentation(license, now);
  const hasExpired = !!license.expiry_date && daysUntil(license.expiry_date, now) < 0;

  return (
    <div className="flex flex-col gap-5">
      <CardImage license={license} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusBadge tone={tone} icon={icon}>{label}</StatusBadge>
        {license.expiry_date && (
          <span className="text-[15px] text-muted-foreground">
            {hasExpired ? 'Caducó el' : 'Caduca el'} {formatDate(license.expiry_date)}
          </span>
        )}
      </div>

      <dl className="divide-y divide-border rounded-[18px] bg-card px-5 py-2 shadow-card">
        {license.member_name && <Detail label="Nombre">{license.member_name}</Detail>}
        <Detail label="Grado">
          <BeltBadge grade={holdsOnlyATitle(license) ? null : license.grade} title={cardTitle(licenses)} />
        </Detail>
        <Detail label="N.º de licencia">{license.license_number}</Detail>
      </dl>

      <DownloadCard license={license} />
    </div>
  );
};
