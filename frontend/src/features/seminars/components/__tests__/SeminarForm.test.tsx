import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SeminarForm } from '../SeminarForm'
import type { Seminar } from '../../data/schemas/seminar.schema'

const updateSeminar = vi.fn()

vi.mock('../../hooks/useSeminarContext', () => ({
  useSeminarContext: () => ({ createSeminar: vi.fn(), updateSeminar }),
}))
vi.mock('@/features/auth/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ userRole: 'super_admin', clubId: null }),
}))
vi.mock('../CoverImageDropZone', () => ({ CoverImageDropZone: () => null }))

const seminar = (start: string, end: string): Seminar =>
  ({
    id: 's1',
    title: 'Técnicas con bokken',
    description: '',
    instructor_name: 'Sensei Ejemplo',
    venue: 'Dojo Ejemplo',
    address: '',
    city: 'Valladolid',
    province: '',
    start_date: start,
    end_date: end,
    price: 25,
    max_participants: 30,
    current_participants: 0,
    status: 'upcoming',
    is_official: false,
  }) as unknown as Seminar

const saveUnchanged = (start: string, end: string) => {
  render(<SeminarForm open onOpenChange={vi.fn()} seminar={seminar(start, end)} />)
  fireEvent.submit(screen.getByLabelText(/fecha y hora de inicio/i).closest('form')!)
  return updateSeminar.mock.calls[0][1]
}

describe('SeminarForm dates', () => {
  beforeEach(() => updateSeminar.mockClear())

  it.each([
    ['winter', '2026-10-31T09:00:00', '2026-12-12T11:00:00'],
    ['summer', '2026-07-11T06:00:00', '2026-07-12T08:00:00'],
    ['across the DST change', '2026-10-24T08:00:00', '2026-10-26T09:00:00'],
  ])('sends back the same instant when an edited %s seminar is saved unchanged', (_, start, end) => {
    const sent = saveUnchanged(start, end)

    expect(sent.start_date).toBe(new Date(`${start}Z`).toISOString())
    expect(sent.end_date).toBe(new Date(`${end}Z`).toISOString())
  })
})
