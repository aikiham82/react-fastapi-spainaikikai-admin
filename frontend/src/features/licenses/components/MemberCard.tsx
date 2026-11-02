import { useEffect, useState } from 'react';
import { Download, IdCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BeltBadge } from '@/components/ui/graphic';
import { StatusBadge } from '@/components/ui/status-badge';
import { daysUntil } from '@/core/utils/expiry';
import { formatDate } from '@/core/utils/format';
import type { License } from '../data/schemas/license.schema';
import { useLicenseImageQuery } from '../hooks/queries/useLicenseQueries';
import { cardGrade, cardTitle, pickCardLicence } from '../utils/cardLicence';
import { getStatusPresentation, isLicenseInForce } from '../utils/licenseStatus';
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

export const CardMessage = ({ title, children }: { title: string; children?: React.ReactNode }) => (
  <div className="flex flex-col items-center gap-3 rounded-[18px] bg-card p-8 text-center shadow-card">
    <IdCard className="size-10 text-muted-foreground" aria-hidden="true" />
    <p className="text-lg font-semibold text-foreground">{title}</p>
    {children}
  </div>
);

interface CardImageProps {
  image: Blob | undefined;
  failed: boolean;
  onRetry: () => void;
}

const CardImage = ({ image, failed, onRetry }: CardImageProps) => {
  const url = useObjectUrl(image);

  if (failed && !image) {
    return (
      <div className="flex aspect-[1748/1240] flex-col items-center justify-center gap-3 rounded-[18px] bg-muted p-5 text-center">
        <p className="text-[15px] text-muted-foreground">No se pudo cargar la imagen</p>
        <Button variant="outline" onClick={onRetry}>Reintentar</Button>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex aspect-[1748/1240] items-center justify-center rounded-[18px] bg-muted">
        <Loader2 className="size-8 animate-spin text-primary" aria-label="Cargando carné" />
      </div>
    );
  }

  return <img src={url} alt="Tu carné" className="aspect-[1748/1240] w-full rounded-[18px] shadow-card" />;
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
  const isInForce = !!license && isLicenseInForce(license, now);
  const { data: image, isError, refetch } = useLicenseImageQuery(isInForce ? license.id : undefined);

  if (!license) {
    return (
      <CardMessage title="Sin licencia vigente">
        <p className="text-[15px] text-muted-foreground">Pregunta a tu club.</p>
      </CardMessage>
    );
  }

  const { tone, label, icon } = getStatusPresentation(license, now);
  const hasExpired = !!license.expiry_date && daysUntil(license.expiry_date, now) < 0;

  return (
    <div className="flex flex-col gap-5">
      {isInForce && <CardImage image={image} failed={isError} onRetry={() => refetch()} />}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusBadge tone={tone} icon={icon}>{label}</StatusBadge>
        {license.expiry_date && (isInForce || hasExpired) && (
          <span className="text-[15px] text-muted-foreground">
            {hasExpired ? 'Caducó el' : 'Caduca el'} {formatDate(license.expiry_date)}
          </span>
        )}
      </div>

      {!isInForce && <p className="text-[15px] text-muted-foreground">Pregunta a tu club.</p>}

      <dl className="divide-y divide-border rounded-[18px] bg-card px-5 py-2 shadow-card">
        {license.member_name && <Detail label="Nombre">{license.member_name}</Detail>}
        <Detail label="Grado">
          <BeltBadge grade={cardGrade(licenses)} title={cardTitle(licenses)} />
        </Detail>
        <Detail label="N.º de licencia">{license.license_number}</Detail>
      </dl>

      {isInForce && (
        <Button
          size="lg"
          className="w-full"
          disabled={!image}
          onClick={() => image && saveCardImage(image, `carne-${license.license_number}.png`)}
        >
          <Download className="mr-2 size-4" aria-hidden="true" />
          Descargar
        </Button>
      )}
    </div>
  );
};
