import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithQuery, userEvent } from '@/test-utils'
import { ImportExportPage } from '../ImportExportPage'

const { exportMutate, isSuperAdmin } = vi.hoisted(() => ({
  exportMutate: vi.fn(),
  isSuperAdmin: { value: false },
}))

const mutation = (mutate = vi.fn()) => ({ isPending: false, mutate, mutateAsync: vi.fn() })

vi.mock('../../hooks/mutations/useImportExportMutations', () => ({
  useImportMembersMutation: () => mutation(),
  useImportLicensesMutation: () => mutation(),
  useImportInsurancesMutation: () => mutation(),
  useImportPaymentsMutation: () => mutation(),
  useExportMembersMutation: () => mutation(exportMutate),
  useExportLicensesMutation: () => mutation(),
  useExportInsurancesMutation: () => mutation(),
  useExportPaymentsMutation: () => mutation(),
}))

vi.mock('@/features/members/hooks/useMemberContext', () => ({
  useMemberContext: () => ({ filters: { limit: 10, offset: 0 } }),
}))

vi.mock('@/core/hooks/usePermissions', () => ({
  usePermissions: () => ({ isAssociationAdmin: () => isSuperAdmin.value }),
}))

describe('ImportExportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isSuperAdmin.value = false
  })

  it('hides the type selector when only members are available', () => {
    renderWithQuery(<ImportExportPage />)
    expect(screen.queryByLabelText('¿Qué quieres descargar?')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('¿Qué quieres subir?')).not.toBeInTheDocument()
    expect(screen.getAllByText('Miembros de tu club')).toHaveLength(2)
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('shows the type selectors to a super admin', () => {
    isSuperAdmin.value = true
    renderWithQuery(<ImportExportPage />)
    expect(screen.getByLabelText('¿Qué quieres descargar?')).toBeInTheDocument()
    expect(screen.getByLabelText('¿Qué quieres subir?')).toBeInTheDocument()
    expect(screen.queryByText('Miembros de tu club')).not.toBeInTheDocument()
  })

  it('shows the template link and downloads the current Excel', async () => {
    renderWithQuery(<ImportExportPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Descargar plantilla' }))
    expect(exportMutate).toHaveBeenCalledTimes(1)
  })

  it('keeps the column choice behind a closed Opciones section', () => {
    renderWithQuery(<ImportExportPage />)
    const details = screen.getByText('Opciones').closest('details')
    expect(details).not.toHaveAttribute('open')
    expect(screen.getByRole('heading', { name: 'Descargar Excel' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Subir Excel' })).toBeInTheDocument()
  })

  it('explains why the import button is disabled', async () => {
    renderWithQuery(<ImportExportPage />)
    expect(screen.getByRole('button', { name: 'Importar' })).toBeDisabled()
    expect(screen.getByText('Elige un archivo primero')).toBeInTheDocument()
    expect(screen.getByText('Archivo .xlsx con la primera fila de títulos')).toBeInTheDocument()

    const file = new File([new Uint8Array(12 * 1024)], 'socios.xlsx')
    await userEvent.upload(screen.getByLabelText('Archivo Excel'), file)

    expect(screen.getByRole('button', { name: 'Importar' })).toBeEnabled()
    expect(screen.queryByText('Elige un archivo primero')).not.toBeInTheDocument()
    expect(screen.getByText('socios.xlsx')).toBeInTheDocument()
    expect(screen.getByText('12 KB')).toBeInTheDocument()
  })
})
