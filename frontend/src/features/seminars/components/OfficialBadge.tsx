import { Award } from 'lucide-react';

export const OfficialBadge = () => {
  return (
    <div
      className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-amber-500 text-white text-xs font-semibold px-2 py-1 rounded-full shadow-sm"
      aria-label="Seminario oficial Spain Aikikai"
      title="Seminario oficial Spain Aikikai"
    >
      <Award className="w-3 h-3" />
      <span>Oficial</span>
    </div>
  );
};
