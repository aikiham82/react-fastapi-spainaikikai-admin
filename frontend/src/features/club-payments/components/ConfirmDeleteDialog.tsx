import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ConfirmDeleteDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading: boolean
  title: string
  description: string
  requiresForce?: boolean
}

export function ConfirmDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  title,
  description,
  requiresForce = false,
}: ConfirmDeleteDialogProps) {
  const [forceChecked, setForceChecked] = useState(false)

  const isConfirmDisabled = isLoading || (requiresForce && !forceChecked)

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setForceChecked(false)
      onClose()
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {requiresForce && (
          <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <Checkbox
              id="force-delete-confirm"
              checked={forceChecked}
              onCheckedChange={(checked) => setForceChecked(checked === true)}
              disabled={isLoading}
              className="mt-0.5"
            />
            <label
              htmlFor="force-delete-confirm"
              className="cursor-pointer text-sm text-destructive leading-snug"
            >
              Confirmo que quiero eliminar un pago procesado por Redsys
            </label>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isLoading}
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: 'destructive' }))}
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            disabled={isConfirmDisabled}
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
