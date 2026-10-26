import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermissions } from '@/core/hooks/usePermissions';
import { TransferClubAccountButton } from '@/features/users/components/TransferClubAccountButton';
import { useClubAccountsQuery } from '../hooks/queries/useClubQueries';

const TITLE_LABELS: Record<string, string> = { shidoin: 'Shidoin', fukushidoin: 'Fukushidoin' };

export const ClubAccountsSection = () => {
  const { isAssociationAdmin } = usePermissions();
  const isSuperAdmin = isAssociationAdmin();
  const { data: accounts, isLoading, isError } = useClubAccountsQuery(isSuperAdmin);

  if (!isSuperAdmin || isLoading) return null;
  if (isError || !accounts) {
    return <p className="mb-6 text-sm text-muted-foreground">No se pudieron cargar las cuentas de club</p>;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>
          <h2>Cuentas de club sin persona</h2>
        </CardTitle>
        <CardDescription>
          Estas cuentas no son de ningún socio, así que no tienen carné. Pásalas a quien lleva el club: seguirá entrando
          con el mismo correo y contraseña.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ningún club usa ya una cuenta de club</p>
        ) : (
          <ul className="divide-y">
            {accounts.map((account) => (
              <li key={account.club_id} className="space-y-2 py-3">
                <div>
                  <p className="font-medium">{account.club_name}</p>
                  <p className="text-sm text-muted-foreground break-all">
                    {account.username} · {account.email}
                  </p>
                </div>
                {account.candidates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sin shidoin ni fukushidoin: pásala desde la ficha del socio
                  </p>
                ) : (
                  <div className="grid gap-2 sm:flex sm:flex-wrap">
                    {account.candidates.map((candidate) => (
                      <TransferClubAccountButton
                        key={candidate.member_id}
                        clubId={account.club_id}
                        accountId={account.account_id}
                        memberId={candidate.member_id}
                        memberName={candidate.name}
                        label={`Pasar la cuenta a ${candidate.name} (${TITLE_LABELS[candidate.instructor_category] ?? candidate.instructor_category})`}
                      />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
