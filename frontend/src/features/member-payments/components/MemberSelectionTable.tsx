import { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Users } from 'lucide-react';
import type { Member } from '@/features/members/data/schemas/member.schema';
import type { MemberPaymentAssignment } from '../data/schemas/member-payment.schema';

// Payment type options for selection
const PAYMENT_TYPE_OPTIONS = [
  { value: 'kyu', label: 'KYU' },
  { value: 'kyu_infantil', label: 'KYU Inf.' },
  { value: 'dan', label: 'DAN' },
  { value: 'fukushidoin_shidoin', label: 'F/S' },
  { value: 'seguro_accidentes', label: 'Seg. Acc.' },
  { value: 'seguro_rc', label: 'Seg. RC' },
] as const;

// License types are mutually exclusive - only one can be selected per member
const EXCLUSIVE_LICENSE_TYPES = new Set(['kyu', 'kyu_infantil', 'dan', 'fukushidoin_shidoin']);

interface MemberSelectionTableProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  initialAssignments?: MemberPaymentAssignment[];
  onConfirm: (assignments: MemberPaymentAssignment[]) => void;
  maxQuantities?: {
    kyu: number;
    kyu_infantil: number;
    dan: number;
    fukushidoin_shidoin: number;
    seguro_accidentes: number;
    seguro_rc: number;
  };
}

export const MemberSelectionTable: React.FC<MemberSelectionTableProps> = ({
  isOpen,
  onClose,
  members,
  initialAssignments = [],
  onConfirm,
  maxQuantities,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [assignments, setAssignments] = useState<Map<string, Set<string>>>(
    () => {
      const map = new Map<string, Set<string>>();
      initialAssignments.forEach((a) => {
        map.set(a.member_id, new Set(a.payment_types));
      });
      return map;
    }
  );

  // Filter members by search term
  const filteredMembers = useMemo(() => {
    if (!searchTerm) return members;
    const term = searchTerm.toLowerCase();
    return members.filter(
      (m) =>
        m.first_name.toLowerCase().includes(term) ||
        m.last_name.toLowerCase().includes(term) ||
        m.dni?.toLowerCase().includes(term)
    );
  }, [members, searchTerm]);

  // Calculate current counts per type
  const currentCounts = useMemo(() => {
    const counts: Record<string, number> = {
      kyu: 0,
      kyu_infantil: 0,
      dan: 0,
      fukushidoin_shidoin: 0,
      seguro_accidentes: 0,
      seguro_rc: 0,
    };
    assignments.forEach((types) => {
      types.forEach((type) => {
        if (counts[type] !== undefined) {
          counts[type]++;
        }
      });
    });
    return counts;
  }, [assignments]);

  // Toggle payment type for a member
  const togglePaymentType = useCallback(
    (memberId: string, paymentType: string) => {
      setAssignments((prev) => {
        const newMap = new Map(prev);
        const memberTypes = new Set(newMap.get(memberId) || []);

        if (memberTypes.has(paymentType)) {
          memberTypes.delete(paymentType);
        } else {
          // If selecting an exclusive license type, remove any other license type first
          if (EXCLUSIVE_LICENSE_TYPES.has(paymentType)) {
            EXCLUSIVE_LICENSE_TYPES.forEach((lt) => memberTypes.delete(lt));
          }
          memberTypes.add(paymentType);
        }

        if (memberTypes.size === 0) {
          newMap.delete(memberId);
        } else {
          newMap.set(memberId, memberTypes);
        }
        return newMap;
      });
    },
    []
  );

  // Toggle all of a type for visible members
  const toggleAllOfType = useCallback(
    (paymentType: string) => {
      setAssignments((prev) => {
        const newMap = new Map(prev);

        // If all visible members have this type, remove it from all
        const allHaveType = filteredMembers.every((m) =>
          newMap.get(m.id)?.has(paymentType)
        );

        if (allHaveType) {
          // Remove from all visible members
          filteredMembers.forEach((m) => {
            const types = newMap.get(m.id);
            if (types) {
              types.delete(paymentType);
              if (types.size === 0) {
                newMap.delete(m.id);
              }
            }
          });
        } else {
          // Add to all visible members that don't have it
          filteredMembers.forEach((m) => {
            const types = newMap.get(m.id);
            if (!types?.has(paymentType)) {
              const memberTypes = new Set(types || []);
              // If adding an exclusive license type, remove any other license type first
              if (EXCLUSIVE_LICENSE_TYPES.has(paymentType)) {
                EXCLUSIVE_LICENSE_TYPES.forEach((lt) => memberTypes.delete(lt));
              }
              memberTypes.add(paymentType);
              newMap.set(m.id, memberTypes);
            }
          });
        }

        return newMap;
      });
    },
    [filteredMembers]
  );

  // Get member name for assignment
  const getMemberName = useCallback(
    (memberId: string) => {
      const member = members.find((m) => m.id === memberId);
      return member ? `${member.first_name} ${member.last_name}` : '';
    },
    [members]
  );

  // Handle confirm
  const handleConfirm = useCallback(() => {
    const result: MemberPaymentAssignment[] = [];
    assignments.forEach((types, memberId) => {
      if (types.size > 0) {
        result.push({
          member_id: memberId,
          member_name: getMemberName(memberId),
          payment_types: Array.from(types),
        });
      }
    });
    onConfirm(result);
    onClose();
  }, [assignments, getMemberName, onConfirm, onClose]);

  // Reset on close
  const handleClose = useCallback(() => {
    setSearchTerm('');
    onClose();
  }, [onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Asignar Miembros a Pagos
          </DialogTitle>
          <DialogDescription>
            Seleccione los tipos de pago para cada miembro. Los totales se
            actualizarán automáticamente.
          </DialogDescription>
        </DialogHeader>

        {/* Quantity Summary */}
        <div className="flex flex-wrap gap-2 py-2">
          {PAYMENT_TYPE_OPTIONS.map((opt) => {
            const current = currentCounts[opt.value] || 0;
            const max = maxQuantities?.[opt.value as keyof typeof maxQuantities];
            const hasMax = max !== undefined && max > 0;
            const matchesMax = hasMax && current === max;

            return (
              <Badge
                key={opt.value}
                variant={matchesMax ? 'default' : current > 0 ? 'default' : 'outline'}
                className={matchesMax ? 'bg-green-600' : current > 0 ? 'bg-blue-600' : ''}
              >
                {opt.label}: {current}{hasMax ? `/${max}` : ''}
              </Badge>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <ScrollArea className="h-[400px] border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 bg-background">
                  Miembro
                </TableHead>
                {PAYMENT_TYPE_OPTIONS.map((opt) => (
                  <TableHead
                    key={opt.value}
                    className="text-center sticky top-0 bg-background cursor-pointer hover:bg-muted"
                    onClick={() => toggleAllOfType(opt.value)}
                    title={`Clic para seleccionar/deseleccionar todos (${opt.label})`}
                  >
                    {opt.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => {
                const memberTypes = assignments.get(member.id) || new Set();
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {member.first_name} {member.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {member.dni}
                        </div>
                      </div>
                    </TableCell>
                    {PAYMENT_TYPE_OPTIONS.map((opt) => {
                      const isChecked = memberTypes.has(opt.value);

                      return (
                        <TableCell key={opt.value} className="text-center">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() =>
                              togglePaymentType(member.id, opt.value)
                            }
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Confirmar Seleccion ({assignments.size} miembros)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
