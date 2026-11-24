import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders, userEvent } from '@/test-utils';
import type { MemberStatusRow } from '../../data/schemas/member-status.schema';
import { MemberStatusBoard } from '../MemberStatusBoard';

const state = vi.hoisted(() => ({ rows: [] as MemberStatusRow[], year: 0 }));

vi.mock('../../hooks/queries/useMemberStatusBoardQuery', () => ({
  useMemberStatusBoardQuery: (year: number) => {
    state.year = year;
    return { data: state.rows, isLoading: false, error: null };
  },
}));

const payment = vi.hoisted(() => ({
  deleteMemberPayment: vi.fn(),
  isLoading: false,
  modal: null as null | Record<string, unknown>,
}));

vi.mock('@/features/club-payments/hooks/mutations/usePaymentAdminMutations', () => ({
  useDeleteMemberPaymentMutation: () => ({ deleteMemberPayment: payment.deleteMemberPayment, isLoading: payment.isLoading }),
}));

vi.mock('@/features/club-payments/components/ManualPaymentModal', () => ({
  ManualPaymentModal: (props: Record<string, unknown>) => {
    payment.modal = props.isOpen ? props : null;
    return null;
  },
}));

const member = vi.hoisted(() => ({ changeStatus: vi.fn(), isPending: false }));

vi.mock('@/features/members/hooks/mutations/useMemberMutations', () => ({
  useChangeMemberStatusMutation: () => ({ mutate: member.changeStatus, isPending: member.isPending }),
}));

const insurance = vi.hoisted(() => ({ update: vi.fn(), isPending: false }));

vi.mock('@/features/insurance/hooks/mutations/useInsuranceMutations', () => ({
  useUpdateInsuranceMutation: () => ({ mutate: insurance.update, isPending: insurance.isPending }),
}));

const download = vi.hoisted(() => ({ exportBoard: vi.fn() }));

vi.mock('../../hooks/mutations/useExportMemberStatusBoardMutation', () => ({
  useExportMemberStatusBoardMutation: () => ({ mutate: download.exportBoard, isPending: false }),
}));

vi.mock('@/features/clubs/components/ClubFilterSelect', () => ({
  ClubFilterSelect: () => null,
}));

const IN_FORCE = { grade: '6º Kyu', technical_grade: 'kyu', instructor_category: 'none', status: 'active', expiration_date: '2099-12-31T00:00:00' };

const row = (overrides: Partial<MemberStatusRow>): MemberStatusRow => ({
  member_id: 'm',
  first_name: 'Ana',
  last_name: 'Example',
  club_id: 'club-a',
  club_name: 'Dojo Example A',
  member_status: 'active',
  license_summary: IN_FORCE,
  insurance_summary: { has_accident: true, accident_status: 'active', has_rc: false, rc_status: null },
  license_paid: true,
  license_payment_id: 'mp-1',
  licence_item: 'kyu',
  ...overrides,
});

const rowOf = (name: string) => screen.getByRole('row', { name: new RegExp(name) });

describe('MemberStatusBoard', () => {
  beforeEach(() => {
    state.rows = [
      row({ member_id: 'paid', first_name: 'Ana' }),
      row({ member_id: 'unpaid', first_name: 'Luis', license_paid: false, license_payment_id: null }),
      row({ member_id: 'none', first_name: 'Eva', license_summary: null, license_paid: false, insurance_summary: null }),
      row({ member_id: 'gone', first_name: 'Noa', member_status: 'inactive', club_name: 'Dojo Example B' }),
    ];
  });

  it('lists each member with their club and the licence of the year paid', () => {
    renderWithProviders(<MemberStatusBoard />);
    const ana = within(rowOf('Ana Example'));
    expect(ana.getByText('Dojo Example A')).toBeInTheDocument();
    expect(ana.getByText('Pagada')).toBeInTheDocument();
    expect(ana.getByText('Activo', { selector: '[data-column="member"] *' })).toBeInTheDocument();
  });

  it('warns in amber when a licence in force has no payment', () => {
    renderWithProviders(<MemberStatusBoard />);
    expect(within(rowOf('Luis Example')).getByText('Sin pagar').closest('[data-tone]')).toHaveAttribute('data-tone', 'warn');
  });

  it('shows a member without licence as not paid without warning', () => {
    renderWithProviders(<MemberStatusBoard />);
    const eva = within(rowOf('Eva Example'));
    expect(eva.getByText('Sin pagar').closest('[data-tone]')).toHaveAttribute('data-tone', 'neutral');
    expect(eva.getByText('Sin licencia')).toBeInTheDocument();
    expect(eva.getAllByText('Sin seguro')).toHaveLength(2);
  });

  it('shows accident and RC insurance apart', () => {
    renderWithProviders(<MemberStatusBoard />);
    const ana = within(rowOf('Ana Example'));
    expect(ana.getByText('Activo', { selector: '[data-column="accident"] *' })).toBeInTheDocument();
    expect(ana.getByText('Sin seguro', { selector: '[data-column="rc"] *' })).toBeInTheDocument();
  });

  it('shows a deregistered member as de baja', () => {
    renderWithProviders(<MemberStatusBoard />);
    expect(within(rowOf('Noa Example')).getByText('De baja')).toBeInTheDocument();
  });

  it('filters by name or club', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MemberStatusBoard />);
    await user.type(screen.getByRole('searchbox'), 'example b');
    expect(screen.queryByRole('row', { name: /Ana Example/ })).not.toBeInTheDocument();
    expect(rowOf('Noa Example')).toBeInTheDocument();
  });

  it('keeps only licences in force without payment with the chip', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MemberStatusBoard />);
    await user.click(screen.getByRole('radio', { name: /En vigor sin pagar/ }));
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(rowOf('Luis Example')).toBeInTheDocument();
  });

  it('opens on the current licence year', () => {
    renderWithProviders(<MemberStatusBoard />);
    expect(state.year).toBe(new Date().getFullYear());
  });

  it('downloads the board of the selected year as Excel', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MemberStatusBoard />);
    await user.click(screen.getByRole('button', { name: 'Descargar Excel' }));
    expect(download.exportBoard).toHaveBeenCalledWith(new Date().getFullYear());
  });
});

describe('MemberStatusBoard paid checkbox', () => {
  beforeEach(() => {
    payment.deleteMemberPayment.mockReset();
    payment.isLoading = false;
    payment.modal = null;
    state.rows = [
      row({ member_id: 'paid', first_name: 'Ana' }),
      row({ member_id: 'unpaid', first_name: 'Luis', license_paid: false, license_payment_id: null }),
    ];
  });

  const checkbox = (name: string) => within(rowOf(name)).getByRole('checkbox', { name: /^Licencia \d+ pagada/ });

  it('ticking an unpaid licence opens the manual payment for that member, club and year', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MemberStatusBoard />);
    await user.click(checkbox('Luis Example'));
    expect(payment.modal).toMatchObject({
      clubId: 'club-a',
      clubName: 'Dojo Example A',
      paymentYear: new Date().getFullYear(),
      members: [{ id: 'unpaid', name: 'Luis Example' }],
      initialPaymentTypes: ['kyu'],
      initialPayerName: 'Luis Example',
    });
  });

  it('unticking a paid licence asks first and then removes that payment line', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MemberStatusBoard />);
    await user.click(checkbox('Ana Example'));
    expect(payment.deleteMemberPayment).not.toHaveBeenCalled();
    const dialog = screen.getByRole('alertdialog');
    expect(
      within(dialog).getByText(`¿Quitar el pago de la licencia ${new Date().getFullYear()} de Ana Example?`)
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Quitar el pago' }));
    expect(payment.deleteMemberPayment).toHaveBeenCalledWith('mp-1');
  });

  it('a member without club cannot be ticked, since a payment belongs to a club', () => {
    state.rows = [row({ member_id: 'clubless', first_name: 'Iker', club_id: null, club_name: null, license_paid: false })];
    renderWithProviders(<MemberStatusBoard />);
    expect(checkbox('Iker Example')).toBeDisabled();
  });

  it('a deregistered member cannot be ticked as paid', () => {
    state.rows = [row({ member_id: 'gone', first_name: 'Noa', member_status: 'inactive', license_paid: false })];
    renderWithProviders(<MemberStatusBoard />);
    expect(checkbox('Noa Example')).toBeDisabled();
  });

  it('a deregistered member whose payment is recorded can still be unticked', () => {
    state.rows = [row({ member_id: 'gone', first_name: 'Noa', member_status: 'inactive' })];
    renderWithProviders(<MemberStatusBoard />);
    expect(checkbox('Noa Example')).toBeEnabled();
  });

  it('a member without licence opens the payment with nothing ticked yet', async () => {
    const user = userEvent.setup();
    state.rows = [row({ member_id: 'new', first_name: 'Eva', license_summary: null, license_paid: false, licence_item: null })];
    renderWithProviders(<MemberStatusBoard />);
    await user.click(checkbox('Eva Example'));
    expect(payment.modal).toMatchObject({ initialPaymentTypes: [] });
  });

  it('the checkbox is disabled while a payment line is being removed', () => {
    payment.isLoading = true;
    renderWithProviders(<MemberStatusBoard />);
    expect(checkbox('Ana Example')).toBeDisabled();
  });
});

describe('MemberStatusBoard member checkbox', () => {
  beforeEach(() => {
    member.changeStatus.mockReset();
    member.isPending = false;
    payment.isLoading = false;
    state.rows = [
      row({ member_id: 'in', first_name: 'Ana' }),
      row({ member_id: 'out', first_name: 'Noa', member_status: 'inactive' }),
    ];
  });

  const checkbox = (name: string) => within(rowOf(name)).getByRole('checkbox', { name: /^Miembro activo/ });

  it('is ticked for an active member and unticked for a deregistered one', () => {
    renderWithProviders(<MemberStatusBoard />);
    expect(checkbox('Ana Example')).toBeChecked();
    expect(checkbox('Noa Example')).not.toBeChecked();
  });

  it('unticking asks first and then deregisters the member', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MemberStatusBoard />);
    await user.click(checkbox('Ana Example'));
    expect(member.changeStatus).not.toHaveBeenCalled();
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/Se dará de baja a "Ana Example"/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Dar de baja' }));
    expect(member.changeStatus).toHaveBeenCalledWith({ id: 'in', data: { status: 'inactive' } });
  });

  it('ticking asks first and then reactivates the member', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MemberStatusBoard />);
    await user.click(checkbox('Noa Example'));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/Se reactivará a "Noa Example"/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Reactivar' }));
    expect(member.changeStatus).toHaveBeenCalledWith({ id: 'out', data: { status: 'active' } });
  });

  it('cancelling changes nothing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MemberStatusBoard />);
    await user.click(checkbox('Ana Example'));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));
    expect(member.changeStatus).not.toHaveBeenCalled();
  });

  it('is disabled while a change is in flight', () => {
    member.isPending = true;
    renderWithProviders(<MemberStatusBoard />);
    expect(checkbox('Ana Example')).toBeDisabled();
  });
});

describe('MemberStatusBoard insurance checkboxes', () => {
  const insured = { has_accident: true, accident_status: 'active', has_rc: true, rc_status: 'active' };
  const uninsured = { has_accident: false, accident_status: null, has_rc: false, rc_status: null };

  beforeEach(() => {
    insurance.update.mockReset();
    insurance.isPending = false;
    member.isPending = false;
    payment.isLoading = false;
    payment.modal = null;
    state.rows = [
      row({ member_id: 'covered', first_name: 'Ana', insurance_summary: insured, accident_insurance_id: 'ac-1', rc_insurance_id: 'rc-1' }),
      row({ member_id: 'bare', first_name: 'Luis', insurance_summary: uninsured }),
    ];
  });

  const accident = (name: string) => within(rowOf(name)).getByRole('checkbox', { name: /^Seguro de accidentes/ });
  const rc = (name: string) => within(rowOf(name)).getByRole('checkbox', { name: /^Seguro RC/ });

  it('are ticked only when that insurance is in force', () => {
    renderWithProviders(<MemberStatusBoard />);
    expect(accident('Ana Example')).toBeChecked();
    expect(rc('Ana Example')).toBeChecked();
    expect(accident('Luis Example')).not.toBeChecked();
    expect(rc('Luis Example')).not.toBeChecked();
  });

  it('ticking accident insurance opens the payment with that insurance and the member as payer', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MemberStatusBoard />);
    await user.click(accident('Luis Example'));
    expect(payment.modal).toMatchObject({
      members: [{ id: 'bare', name: 'Luis Example' }],
      initialPaymentTypes: ['seguro_accidentes'],
      initialPayerName: 'Luis Example',
    });
  });

  it('ticking RC opens the payment with the RC insurance', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MemberStatusBoard />);
    await user.click(rc('Luis Example'));
    expect(payment.modal).toMatchObject({ initialPaymentTypes: ['seguro_rc'] });
  });

  it('unticking asks first and then annuls that insurance', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MemberStatusBoard />);
    await user.click(accident('Ana Example'));
    expect(insurance.update).not.toHaveBeenCalled();
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText('¿Anular el seguro de accidentes de Ana Example?')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Anular seguro' }));
    expect(insurance.update).toHaveBeenCalledWith({ id: 'ac-1', data: { annulled: true } }, expect.anything());
  });

  it('unticking RC names the RC insurance and annuls it', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MemberStatusBoard />);
    await user.click(rc('Ana Example'));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText('¿Anular el seguro RC de Ana Example?')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Anular seguro' }));
    expect(insurance.update).toHaveBeenCalledWith({ id: 'rc-1', data: { annulled: true } }, expect.anything());
  });

  it('ticking an annulled insurance of the season reactivates it instead of paying again', async () => {
    const user = userEvent.setup();
    state.rows = [row({
      member_id: 'annulled', first_name: 'Eva',
      insurance_summary: { has_accident: true, accident_status: 'cancelled', has_rc: false, rc_status: null },
      accident_insurance_id: 'ac-2', accident_insurance_annulled: true,
    })];
    renderWithProviders(<MemberStatusBoard />);
    expect(accident('Eva Example')).not.toBeChecked();
    await user.click(accident('Eva Example'));
    expect(payment.modal).toBeNull();
    expect(insurance.update).toHaveBeenCalledWith({ id: 'ac-2', data: { annulled: false } }, expect.anything());
  });

  it('the RC of an instructor is locked, since the title includes it', () => {
    state.rows = [row({ member_id: 'sensei', first_name: 'Mario', licence_item: 'shidoin', insurance_summary: uninsured })];
    renderWithProviders(<MemberStatusBoard />);
    expect(rc('Mario Example')).toBeDisabled();
    expect(within(rowOf('Mario Example')).getByText('Va incluido en su título')).toBeInTheDocument();
    expect(accident('Mario Example')).toBeEnabled();
  });

  it('an RC in force of an instructor can still be unticked', () => {
    state.rows = [row({
      member_id: 'sensei', first_name: 'Mario', licence_item: 'shidoin', insurance_summary: insured,
      accident_insurance_id: 'ac-3', rc_insurance_id: 'rc-3',
    })];
    renderWithProviders(<MemberStatusBoard />);
    expect(rc('Mario Example')).toBeEnabled();
  });

  it('a deregistered member cannot be given an insurance', () => {
    state.rows = [row({ member_id: 'gone', first_name: 'Noa', member_status: 'inactive', insurance_summary: uninsured })];
    renderWithProviders(<MemberStatusBoard />);
    expect(accident('Noa Example')).toBeDisabled();
    expect(rc('Noa Example')).toBeDisabled();
  });

  it('are disabled while an insurance is being changed', () => {
    insurance.isPending = true;
    renderWithProviders(<MemberStatusBoard />);
    expect(accident('Ana Example')).toBeDisabled();
  });
});
