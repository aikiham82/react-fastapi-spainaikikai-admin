import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, within } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { MemberForm } from '../MemberForm'
import type { Member } from '../../data/schemas/member.schema'

const { updateMember, createMember, changeMemberGrade, clubs } = vi.hoisted(() => ({
  updateMember: vi.fn(),
  createMember: vi.fn(),
  changeMemberGrade: vi.fn(),
  clubs: [{ id: 'club-1', name: 'Example Club' }],
}))

const authState = vi.hoisted(() => ({ userRole: 'super_admin', clubId: 'club-1' as string | null }))

vi.mock('@/features/auth/hooks/useAuthContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth/hooks/useAuthContext')>()),
  useAuthContext: () => authState,
}))

vi.mock('../../hooks/useMemberContext', () => ({
  useMemberContext: () => ({ updateMember, createMember, changeMemberGrade }),
}))

vi.mock('../../../clubs/hooks/useClubContext', () => ({
  useClubContext: () => ({ clubs }),
}))

vi.mock('@/features/users/components/MemberAccessAccount', () => ({
  MemberAccessAccount: () => null,
}))

const member = (overrides: Partial<Member> = {}): Member =>
  ({
    id: 'member-1',
    first_name: 'Ana',
    last_name: 'Example',
    club_id: 'club-1',
    created_at: '2025-10-01T15:51:19',
    registration_date: null,
    ...overrides,
  }) as Member

const renderEditing = (overrides: Partial<Member> = {}) =>
  renderWithProviders(<MemberForm open onOpenChange={vi.fn()} member={member(overrides)} />)

describe('MemberForm registration date', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.userRole = 'super_admin'
  })

  it('prefills the join date with the creation date when there is no registration date', () => {
    renderEditing()

    expect(screen.getByLabelText('Fecha de alta')).toHaveValue('2025-10-01')
  })

  it('prefills the join date with the registration date when present', () => {
    renderEditing({ registration_date: '2018-03-05T00:00:00' })

    expect(screen.getByLabelText('Fecha de alta')).toHaveValue('2018-03-05')
  })

  it('sends the edited registration date on submit', async () => {
    renderEditing()

    fireEvent.change(screen.getByLabelText('Fecha de alta'), { target: { value: '2024-09-01' } })
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(updateMember).toHaveBeenCalledWith(
      'member-1',
      expect.objectContaining({ registration_date: '2024-09-01' }),
      expect.any(Function)
    )
  })

  it('stays open until the edit is saved, so a refused DNI keeps what was typed', async () => {
    const onOpenChange = vi.fn()
    renderWithProviders(<MemberForm open onOpenChange={onOpenChange} member={member()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(onOpenChange).not.toHaveBeenCalled()
    const onSaved = updateMember.mock.calls[0][2]
    onSaved()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('defaults the join date to today when creating', () => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    renderWithProviders(<MemberForm open onOpenChange={vi.fn()} member={null} />)

    expect(screen.getByLabelText('Fecha de alta')).toHaveValue(today)
  })

  it('does not write the creation date as join date when the join date is left alone', async () => {
    renderEditing()

    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(updateMember.mock.calls[0][1]).not.toHaveProperty('registration_date')
  })

  it('refuses a future join date', async () => {
    renderEditing()

    fireEvent.change(screen.getByLabelText('Fecha de alta'), { target: { value: '2999-01-01' } })
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(screen.getByText('La fecha de alta no puede ser futura')).toBeInTheDocument()
    expect(updateMember).not.toHaveBeenCalled()
  })
})

describe('MemberForm club field', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does not preselect a club for super admins', () => {
    authState.userRole = 'super_admin'
    renderWithProviders(<MemberForm open onOpenChange={vi.fn()} member={null} />)

    expect(screen.getByRole('combobox', { name: /Club/ })).toHaveTextContent('Selecciona un club')
  })

  it('requires a club for super admins', async () => {
    authState.userRole = 'super_admin'
    renderWithProviders(<MemberForm open onOpenChange={vi.fn()} member={null} />)

    await userEvent.type(screen.getByLabelText(/Nombre/), 'Ana')
    await userEvent.click(screen.getByRole('button', { name: 'Crear miembro' }))

    expect(screen.getByText('Selecciona un club', { selector: 'p' })).toBeInTheDocument()
    expect(createMember).not.toHaveBeenCalled()
  })

  it('hides the club field for club admins and uses their club', async () => {
    authState.userRole = 'club_admin'
    authState.clubId = 'club-1'
    renderWithProviders(<MemberForm open onOpenChange={vi.fn()} member={null} />)

    expect(screen.queryByText('Club')).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/Nombre/), 'Ana')
    await userEvent.click(screen.getByRole('button', { name: 'Crear miembro' }))

    expect(createMember).toHaveBeenCalledWith(
      expect.objectContaining({ club_id: 'club-1' }),
      expect.any(Function)
    )
  })

  it('keeps address details under Más datos', () => {
    renderWithProviders(<MemberForm open onOpenChange={vi.fn()} member={null} />)

    expect(screen.getByText('Más datos')).toBeInTheDocument()
  })
})

describe('MemberForm grade', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.userRole = 'club_admin'
  })

  const licensed = (grade: string, technical_grade: 'kyu' | 'dan') =>
    renderEditing({
      license_summary: { grade, technical_grade, instructor_category: 'none', status: 'active', expiration_date: null },
    })

  const openGrades = async () => {
    await userEvent.click(screen.getByRole('combobox', { name: 'Grado' }))
    return within(screen.getByRole('listbox')).getAllByRole('option').map((option) => option.textContent)
  }

  it('offers only the numbers of the kyu the member already holds', async () => {
    licensed('5º Kyu', 'kyu')

    expect(await openGrades()).toEqual(['1.er Kyu', '2.º Kyu', '3.er Kyu', '4.º Kyu', '5.º Kyu', '6.º Kyu'])
  })

  it('offers dan numbers up to ten for a dan', async () => {
    licensed('1er Dan', 'dan')

    expect(await openGrades()).toHaveLength(10)
  })

  it('sends the new grade number on save', async () => {
    licensed('5º Kyu', 'kyu')

    await openGrades()
    await userEvent.click(screen.getByRole('option', { name: '4.º Kyu' }))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(changeMemberGrade).toHaveBeenCalledWith('member-1', 4)
  })

  it('does not change the grade when it is left alone', async () => {
    licensed('5º Kyu', 'kyu')

    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(changeMemberGrade).not.toHaveBeenCalled()
  })

  it('cannot change the grade of a member without licence', () => {
    renderEditing()

    expect(screen.getByRole('combobox', { name: 'Grado' })).toBeDisabled()
    expect(screen.getByText('Este socio aún no tiene licencia.')).toBeInTheDocument()
  })
})
