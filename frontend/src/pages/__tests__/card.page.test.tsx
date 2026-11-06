import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, userEvent } from '@/test-utils';
import CardPage from '../card.page';

const retryLoadingUser = vi.fn();
const authContext = {
  isAuthenticated: true,
  currentUser: null as null | { member_id?: string },
  userLoadFailed: false,
  retryLoadingUser,
  userRole: null as null | 'club_admin',
  logout: vi.fn(),
};

vi.mock('@/features/auth/hooks/useAuthContext', () => ({
  useAuthContext: () => authContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/features/auth/components/InstallAppButton', () => ({ InstallAppButton: () => null }));

vi.mock('@/features/club-payments/components/ExamPaymentModal', () => ({
  ExamPaymentModal: ({ isOpen, forMember }: { isOpen: boolean; forMember?: { id: string } }) =>
    isOpen ? <div role="dialog" data-testid="own-exam">{forMember?.id}</div> : null,
}));

const licensesQuery = vi.fn();

vi.mock('@/features/licenses/hooks/queries/useLicenseQueries', () => ({
  useMemberLicensesQuery: () => licensesQuery(),
  useLicenseImageQuery: () => ({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() }),
}));

describe('CardPage exam payment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(authContext, { currentUser: { member_id: 'member-1' }, userLoadFailed: false, userRole: null });
    licensesQuery.mockReturnValue({ data: [], isLoading: false, refetch: vi.fn() });
  });

  it('lets a member pay their own exam from the card', async () => {
    renderWithProviders(<CardPage />);

    await userEvent.click(screen.getByRole('button', { name: /Pagar examen/ }));

    expect(screen.getByTestId('own-exam')).toHaveTextContent('member-1');
  });

  it('offers no exam payment to an account without a member', () => {
    Object.assign(authContext, { currentUser: { member_id: undefined } });
    renderWithProviders(<CardPage />);

    expect(screen.queryByRole('button', { name: /Pagar examen/ })).not.toBeInTheDocument();
  });
});

describe('CardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(authContext, { currentUser: { member_id: 'member-1' }, userLoadFailed: false, userRole: null });
    licensesQuery.mockReturnValue({ data: [], isLoading: false, refetch: vi.fn() });
  });

  it('offers a retry instead of a spinner when the user cannot be loaded', async () => {
    Object.assign(authContext, { currentUser: null, userLoadFailed: true });
    renderWithProviders(<CardPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(screen.getByText('No se pudo cargar tu carné')).toBeInTheDocument();
    expect(retryLoadingUser).toHaveBeenCalled();
  });

  it('tells an account without member', () => {
    Object.assign(authContext, { currentUser: {} });
    renderWithProviders(<CardPage />);

    expect(screen.getByText('Tu cuenta no tiene ficha de socio')).toBeInTheDocument();
  });

  it('offers a retry when the licences cannot be loaded', () => {
    licensesQuery.mockReturnValue({ data: undefined, isLoading: false, refetch: vi.fn() });
    renderWithProviders(<CardPage />);

    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('takes a manager back to the panel, and not a member', () => {
    const { unmount } = renderWithProviders(<CardPage />);
    expect(screen.queryByRole('link', { name: 'Volver al panel' })).not.toBeInTheDocument();
    unmount();

    Object.assign(authContext, { userRole: 'club_admin' });
    renderWithProviders(<CardPage />);

    expect(screen.getByRole('link', { name: 'Volver al panel' })).toHaveAttribute('href', '/');
  });
});
