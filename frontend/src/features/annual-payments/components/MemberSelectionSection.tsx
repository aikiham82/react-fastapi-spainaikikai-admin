import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Trash2 } from 'lucide-react';
import { useAnnualPaymentContext } from '../hooks/useAnnualPaymentContext';
import { MemberSelectionTable } from '@/features/member-payments/components/MemberSelectionTable';

export const MemberSelectionSection: React.FC = () => {
  const {
    formData,
    members,
    isLoadingMembers,
    isMemberSelectionOpen,
    openMemberSelection,
    closeMemberSelection,
    setMemberAssignments,
  } = useAnnualPaymentContext();

  const hasQuantities =
    formData.kyu_count > 0 ||
    formData.kyu_infantil_count > 0 ||
    formData.dan_count > 0 ||
    formData.fukushidoin_shidoin_count > 0 ||
    formData.seguro_accidentes_count > 0 ||
    formData.seguro_rc_count > 0;

  const hasAssignments = formData.member_assignments.length > 0;

  // Count assignments per type
  const assignmentCounts = formData.member_assignments.reduce(
    (acc, assignment) => {
      assignment.payment_types.forEach((type) => {
        acc[type] = (acc[type] || 0) + 1;
      });
      return acc;
    },
    {} as Record<string, number>
  );

  if (!formData.club_id) {
    return (
      <div className="border rounded-lg p-4 bg-muted/50">
        <h3 className="font-medium mb-2 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Asignacion de Miembros
        </h3>
        <p className="text-sm text-muted-foreground">
          Seleccione un club para poder asignar miembros a los pagos.
        </p>
      </div>
    );
  }

  if (!hasQuantities && !hasAssignments) {
    return (
      <div className="border rounded-lg p-4 bg-muted/50">
        <h3 className="font-medium mb-2 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Asignacion de Miembros
        </h3>
        <p className="text-sm text-muted-foreground">
          Indique cantidades en las secciones anteriores para poder asignar miembros.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium flex items-center gap-2">
          <Users className="h-5 w-5" />
          Asignacion de Miembros
          {hasAssignments && (
            <Badge variant="secondary">{formData.member_assignments.length} asignados</Badge>
          )}
        </h3>
        <div className="flex gap-2">
          {hasAssignments && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMemberAssignments([])}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
          <Button
            type="button"
            variant={hasAssignments ? 'outline' : 'default'}
            size="sm"
            onClick={openMemberSelection}
            disabled={isLoadingMembers}
          >
            <UserPlus className="h-4 w-4 mr-1" />
            {hasAssignments ? 'Modificar' : 'Seleccionar Miembros'}
          </Button>
        </div>
      </div>

      {hasAssignments ? (
        <div className="space-y-3">
          {/* Summary badges */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(assignmentCounts).map(([type, count]) => (
              <Badge key={type} variant="outline">
                {type}: {count}
              </Badge>
            ))}
          </div>

          {/* List of assigned members */}
          <div className="max-h-40 overflow-y-auto space-y-1">
            {formData.member_assignments.map((assignment) => (
              <div
                key={assignment.member_id}
                className="flex items-center justify-between text-sm p-2 bg-muted rounded"
              >
                <span className="font-medium">{assignment.member_name}</span>
                <div className="flex gap-1">
                  {assignment.payment_types.map((type) => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Opcional: Asigne miembros especificos a cada tipo de pago para un seguimiento
          detallado. Si no asigna miembros, el pago se registrara solo a nivel de club.
        </p>
      )}

      {/* Member Selection Modal */}
      <MemberSelectionTable
        isOpen={isMemberSelectionOpen}
        onClose={closeMemberSelection}
        members={members}
        initialAssignments={formData.member_assignments}
        onConfirm={setMemberAssignments}
        maxQuantities={{
          kyu: formData.kyu_count,
          kyu_infantil: formData.kyu_infantil_count,
          dan: formData.dan_count,
          fukushidoin_shidoin: formData.fukushidoin_shidoin_count,
          seguro_accidentes: formData.seguro_accidentes_count,
          seguro_rc: formData.seguro_rc_count,
        }}
      />
    </div>
  );
};
