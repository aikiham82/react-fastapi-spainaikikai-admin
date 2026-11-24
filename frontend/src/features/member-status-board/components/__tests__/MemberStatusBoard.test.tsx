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

  const checkbox = (name: string) => within(rowOf(name)).getByRole('checkbox');

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
