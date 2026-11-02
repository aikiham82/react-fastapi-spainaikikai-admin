import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test-utils';
import type { License } from '../../data/schemas/license.schema';
import { saveCardImage } from '../../utils/saveCardImage';
import { MemberCard } from '../MemberCard';

const refetchImage = vi.fn();
const imageQuery = vi.fn();

vi.mock('../../hooks/queries/useLicenseQueries', () => ({
  useLicenseImageQuery: () => imageQuery(),
}));

vi.mock('../../utils/saveCardImage', () => ({ saveCardImage: vi.fn() }));

const NOW = new Date('2026-11-02T10:00:00');

const licence = (overrides: Partial<License> = {}): License => ({
  id: 'lic-1',
  license_number: 'LIC-2026-0001',
  member_id: 'member-1',
  member_name: 'Ana Pérez',
  member_status: 'active',
  grade: '3º Kyu',
  issue_date: '2026-01-01T00:00:00',
  expiry_date: '2027-06-30T23:59:59',
  status: 'active',
  dan_grade: 3,
  technical_grade: 'kyu',
  instructor_category: 'none',
  age_category: 'adulto',
  created_at: '2026-01-01T00:00:00',
  updated_at: '2026-01-01T00:00:00',
  ...overrides,
});

const renderCard = (licenses: License[]) => renderWithProviders(<MemberCard licenses={licenses} now={NOW} />);

describe('MemberCard', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:card');
    URL.revokeObjectURL = vi.fn();
    imageQuery.mockReturnValue({ data: new Blob(['png']), isLoading: false, isError: false, refetch: refetchImage });
  });

  it('shows a licence in date as active, with the image and details', () => {
    renderCard([licence()]);

    expect(screen.getByText('Activa')).toBeInTheDocument();
    expect(screen.getByText('Caduca el 30/06/2027')).toBeInTheDocument();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('LIC-2026-0001')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Tu carné' })).toHaveAttribute('src', 'blob:card');
  });

  it('shows a licence past its date as expired even if stored active', () => {
    renderCard([licence({ expiry_date: '2025-12-31T23:59:59' })]);

    expect(screen.getByText('Caducada')).toBeInTheDocument();
    expect(screen.getByText('Caducó el 31/12/2025')).toBeInTheDocument();
  });

  it.each([
    ['expired', { expiry_date: '2025-12-31T23:59:59' }],
    ['deregistered', { member_status: 'inactive' }],
    ['revoked', { status: 'revoked' as const }],
  ])('offers no card image to keep when the licence is %s', (_state, overrides) => {
    renderCard([licence(overrides)]);

    expect(screen.queryByRole('img', { name: 'Tu carné' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Descargar' })).not.toBeInTheDocument();
    expect(screen.getByText('Pregunta a tu club.')).toBeInTheDocument();
  });

  it('does not promise a future expiry to a deregistered member', () => {
    renderCard([licence({ member_status: 'inactive' })]);

    expect(screen.queryByText(/caduca el/i)).not.toBeInTheDocument();
  });

  it('keeps the name of the member out of the image description', () => {
    renderCard([licence()]);

    expect(screen.getByRole('img').getAttribute('alt')).not.toContain('Ana');
  });

  it('keeps showing the image when a later refresh fails', () => {
    imageQuery.mockReturnValue({ data: new Blob(['png']), isLoading: false, isError: true, refetch: refetchImage });
    renderCard([licence()]);

    expect(screen.getByRole('img', { name: 'Tu carné' })).toBeInTheDocument();
  });

  it('shows a licence stored expired as expired', () => {
    renderCard([licence({ status: 'expired', expiry_date: '2025-12-31T23:59:59' })]);

    expect(screen.getByText('Caducada')).toBeInTheDocument();
  });

  it('shows a deregistered member as such, whatever the date', () => {
    renderCard([licence({ member_status: 'inactive' })]);

    expect(screen.getByText('De baja')).toBeInTheDocument();
    expect(screen.queryByText('Activa')).not.toBeInTheDocument();
  });

  it('treats a member without status as active', () => {
    renderCard([licence({ member_status: undefined })]);

    expect(screen.getByText('Activa')).toBeInTheDocument();
  });

  it('warns when the licence expires within 30 days', () => {
    renderCard([licence({ expiry_date: '2026-11-20T23:59:59' })]);

    expect(screen.getByText('Caduca pronto')).toBeInTheDocument();
  });

  it('shows a revoked licence as annulled', () => {
    renderCard([licence({ status: 'revoked' })]);

    expect(screen.getByText('Anulada')).toBeInTheDocument();
  });

  it('shows the grade and the title of a member holding them on two licences', () => {
    renderCard([
      licence({ id: 'title', grade: 'Shidoin', dan_grade: 0, instructor_category: 'shidoin', technical_grade: 'dan' }),
      licence({ id: 'grade', grade: '5º Dan', dan_grade: 5, technical_grade: 'dan' }),
    ]);

    expect(screen.getByText('5.º Dan')).toBeInTheDocument();
    expect(screen.getByText('Shidoin')).toBeInTheDocument();
  });

  it('tells a member without licence to ask their club', () => {
    renderCard([]);

    expect(screen.getByText('Sin licencia vigente')).toBeInTheDocument();
    expect(screen.getByText('Pregunta a tu club.')).toBeInTheDocument();
  });

  it('offers a retry when the image fails, and nothing to download', async () => {
    imageQuery.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: refetchImage });
    renderCard([licence()]);

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(screen.getByText('No se pudo cargar la imagen')).toBeInTheDocument();
    expect(refetchImage).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Descargar' })).toBeDisabled();
  });

  it('saves the image named after the licence', async () => {
    const image = new Blob(['png']);
    imageQuery.mockReturnValue({ data: image, isLoading: false, isError: false, refetch: refetchImage });
    renderCard([licence()]);

    await userEvent.click(screen.getByRole('button', { name: 'Descargar' }));

    expect(saveCardImage).toHaveBeenCalledWith(image, 'carne-LIC-2026-0001.png');
  });
});
