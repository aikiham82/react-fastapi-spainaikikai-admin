import { Button } from '@/components/ui/button';

interface AnnulmentPanelProps {
  annulled: boolean;
  annulledText: string;
  activeText: string;
  annulLabel: string;
  reactivateLabel: string;
  onToggle: (annulled: boolean) => void;
}

export const AnnulmentPanel = ({
  annulled,
  annulledText,
  activeText,
  annulLabel,
  reactivateLabel,
  onToggle,
}: AnnulmentPanelProps) => (
  <div className="flex items-center justify-between gap-3 rounded-md border p-3">
    <p className="text-sm text-gray-600">{annulled ? annulledText : activeText}</p>
    <Button type="button" variant="outline" size="sm" onClick={() => onToggle(!annulled)}>
      {annulled ? reactivateLabel : annulLabel}
    </Button>
  </div>
);
