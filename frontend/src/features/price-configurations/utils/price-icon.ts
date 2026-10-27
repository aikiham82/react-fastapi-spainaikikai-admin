import { BadgeCheck, Building2, HeartPulse, IdCard, ShieldCheck, Tag, type LucideIcon } from 'lucide-react';

const KEY_ICONS: Record<string, LucideIcon> = {
  club_fee: Building2,
  seguro_accidentes: HeartPulse,
  seguro_rc: ShieldCheck,
  oficialidad_seminar: BadgeCheck,
};

export const priceIconOf = (key: string, category?: string): LucideIcon =>
  KEY_ICONS[key] ?? (category === 'license' ? IdCard : Tag);
