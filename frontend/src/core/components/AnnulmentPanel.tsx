import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface AnnulmentPanelProps {
  annulled: boolean;
  annulledText: string;
  activeText: string;
  annulLabel: string;
  reactivateLabel: string;
  confirmTitle: string;
  confirmText: string;
  onToggle: (annulled: boolean) => void;
}

export const AnnulmentPanel = ({
  annulled,
  annulledText,
  activeText,
  annulLabel,
  reactivateLabel,
  confirmTitle,
  confirmText,
  onToggle,
}: AnnulmentPanelProps) => {
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-md border p-3',
        annulled && 'border-amber-300 bg-amber-50',
      )}
    >
      <p className="text-sm text-gray-600">{annulled ? annulledText : activeText}</p>
      <Button
        type="button"
        variant="outline"
        className="h-10 sm:h-8"
        onClick={() => (annulled ? onToggle(false) : setIsConfirming(true))}
      >
        {annulled ? reactivateLabel : annulLabel}
      </Button>

      <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmText}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => onToggle(true)}>{annulLabel}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
