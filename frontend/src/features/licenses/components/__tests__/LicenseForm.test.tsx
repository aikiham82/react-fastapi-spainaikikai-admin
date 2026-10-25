import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { LicenseForm } from '../LicenseForm'
import type { License } from '../../data/schemas/license.schema'

const createLicense = vi.fn()
const updateLicense = vi.fn()

vi.mock('../../hooks/useLicenseContext', () => ({
  useLicenseContext: () => ({ createLicense, updateLicense }),
}))

const LICENCE: License = {
  id: 'license-ana',
  license_number: 'LIC-1',
  member_id: 'member-ana',
  member_name: 'Ana Example',
  issue_date: '2026-01-15T00:00:00',
  expiry_date: '2026-12-31T23:59:59',
  status: 'active',
  dan_grade: 3,
  technical_grade: 'kyu',
  instructor_category: 'none',
  age_category: 'adulto',
  created_at: '2026-01-15T00:00:00',
  updated_at: '2026-01-15T00:00:00',
}

const MEMBERS = [{ id: 'member-ana', name: 'Ana Example' }]

const choose = async (label: string, option: string) => {
  await userEvent.click(screen.getByRole('combobox', { name: label }))
  await userEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: option }))
}

describe('LicenseForm', () => {
  beforeEach(() => {
    createLicense.mockClear()
    updateLicense.mockClear()
  })

  it('creates a licence with its instructor and age categories', async () => {
    renderWithProviders(<LicenseForm open onOpenChange={vi.fn()} memberOptions={MEMBERS} />)

    await userEvent.click(screen.getByRole('combobox', { name: 'Miembro *' }))
    await userEvent.click(screen.getByRole('option', { name: 'Ana Example' }))
    await userEvent.type(screen.getByLabelText('Fecha de Emisión *'), '2026-01-15')
    await userEvent.type(screen.getByLabelText('Fecha de Vencimiento *'), '2026-12-31')
    await choose('Cat. Instructor', 'Shidoin')
    await choose('Cat. Edad', 'Infantil')
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }))

    expect(createLicense).toHaveBeenCalledWith(
      expect.objectContaining({ member_id: 'member-ana', instructor_category: 'shidoin', age_category: 'infantil' }),
    )
  })

  it('edits the expiration date and grade', async () => {
    renderWithProviders(<LicenseForm open onOpenChange={vi.fn()} license={LICENCE} memberOptions={MEMBERS} />)

    const expiry = screen.getByLabelText('Fecha de Vencimiento *')
    await userEvent.clear(expiry)
    await userEvent.type(expiry, '2027-12-31')
    await choose('Grado *', '1º Kyu')
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }))

    expect(updateLicense).toHaveBeenCalledWith('license-ana', {
      issue_date: '2026-01-15',
      expiration_date: '2027-12-31',
      grade: '1º Kyu',
      technical_grade: 'kyu',
      instructor_category: 'none',
      age_category: 'adulto',
    })
  })

  it('annuls and reactivates a licence', async () => {
    const { rerender } = renderWithProviders(
      <LicenseForm open onOpenChange={vi.fn()} license={LICENCE} memberOptions={MEMBERS} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Anular licencia' }))
    expect(updateLicense).toHaveBeenLastCalledWith('license-ana', { annulled: true })

    rerender(<LicenseForm open onOpenChange={vi.fn()} license={{ ...LICENCE, status: 'revoked' }} memberOptions={MEMBERS} />)
    await userEvent.click(screen.getByRole('button', { name: 'Reactivar licencia' }))
    expect(updateLicense).toHaveBeenLastCalledWith('license-ana', { annulled: false })
  })
})
