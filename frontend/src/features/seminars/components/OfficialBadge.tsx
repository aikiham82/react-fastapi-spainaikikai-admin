import { BadgeCheck } from 'lucide-react';

export const OfficialBadge = () => {
  return (
    <div
      className="absolute top-2 right-2 z-10 flex h-[26px] items-center gap-1.5 rounded-full bg-primary pl-2 pr-2.5 text-[12.5px] font-semibold text-primary-foreground shadow-card"
      aria-label="Seminario oficial Spain Aikikai"
      title="Seminario oficial Spain Aikikai"
    >
      <BadgeCheck className="size-3.5" aria-hidden="true" />
      <span>Oficial</span>
    </div>
  );
};
