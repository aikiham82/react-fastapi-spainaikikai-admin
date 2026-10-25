import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LineActionsProps {
  onEdit: () => void
  onDelete: () => void
}

export function LineActions({ onEdit, onDelete }: LineActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onEdit}>
        <Pencil className="h-4 w-4 mr-1" />
        Editar
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4 mr-1" />
        Eliminar
      </Button>
    </div>
  )
}
