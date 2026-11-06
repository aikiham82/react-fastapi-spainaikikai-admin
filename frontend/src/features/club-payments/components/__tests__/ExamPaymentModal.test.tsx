import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, within } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { ExamPaymentModal } from '../ExamPaymentModal'

const mockRegisterExamPayment = vi.fn()
let mockPrices: { key: string; price: number }[] = []

vi.mock('../../hooks/queries/useExamPricesQuery', () => ({
  useExamPricesQuery: () => ({ data: mockPrices, isLoading: false, isError: false }),
}))

vi.mock('../../hooks/mutations/usePaymentAdminMutations', () => ({
  useRegisterManualExamPaymentMutation: () => ({
    registerExamPayment: mockRegisterExamPayment,
    isLoading: false,
    isSuccess: false,
  }),
}))

const members = [
  { id: 'm-dan', name: 'Lucía Prueba', grade: '1st Dan' },
  { id: 'm-kyu', name: 'Mario Ejemplo', grade: '1st Kyu' },
]

const ALL_PRICES = [
  { key: 'examen_dan_1_hombu', price: 110 },
  { key: 'examen_dan_1', price: 165 },
  { key: 'examen_dan_2', price: 175 },
  { key: 'examen_dan_3', price: 250 },
  { key: 'examen_dan_4', price: 330 },
  { key: 'examen_dan_5', price: 450 },
  { key: 'examen_dan_6', price: 515 },
]

const renderModal = () =>
  renderWithProviders(
    <ExamPaymentModal isOpen onClose={vi.fn()} clubName="Club Prueba" members={members} isLoadingMembers={false} />
  )

describe('ExamPaymentModal', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    mockPrices = ALL_PRICES
  })

  it('opens with its title and the club name', () => {
    renderModal()

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Pagar examen')).toBeInTheDocument()
    expect(screen.getByText('Club Prueba')).toBeInTheDocument()
  })

  it('shows every exam with its price once a member is chosen', async () => {
    renderModal()
    await user.click(screen.getByRole('button', { name: /Mario Ejemplo/ }))

    expect(screen.getByRole('radio', { name: /1\.er Dan.*con nº Hombu.*110,00/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /1\.er Dan.*sin nº Hombu.*165,00/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /6\.º Dan.*515,00/ })).toBeInTheDocument()
  })

  it('preselects the next dan for a dan member and totals its price', async () => {
    renderModal()
    await user.click(screen.getByRole('button', { name: /Lucía Prueba/ }))

    expect(screen.getByRole('radio', { name: /2\.º Dan/ })).toBeChecked()
    expect(screen.getByText(/Total:/)).toHaveTextContent(/175,00\s€/)
  })

  it('preselects nothing for a kyu member, who must choose with or without Hombu number', async () => {
    renderModal()
    await user.click(screen.getByRole('button', { name: /Mario Ejemplo/ }))

    const grades = screen.getByRole('radiogroup', { name: 'Grado al que se presenta' })
    expect(within(grades).queryByRole('radio', { checked: true })).not.toBeInTheDocument()
  })

  it('registers the exam with grade, date, venue and method', async () => {
    renderModal()
    await user.click(screen.getByRole('button', { name: /Lucía Prueba/ }))
    fireEvent.change(screen.getByLabelText('Fecha del examen'), { target: { value: '2026-11-14' } })
    await user.type(screen.getByLabelText('Lugar del examen'), 'Madrid')
    await user.click(screen.getByRole('radio', { name: 'Efectivo' }))
    await user.click(screen.getByRole('button', { name: 'Registrar pago' }))

    expect(mockRegisterExamPayment).toHaveBeenCalledWith({
      member_id: 'm-dan',
      exam: 'examen_dan_2',
      exam_date: '2026-11-14',
      venue: 'Madrid',
      payer_name: 'Club Prueba',
      payment_method: 'cash',
    })
  })

  it('asks for the venue instead of sending an empty one', async () => {
    renderModal()
    await user.click(screen.getByRole('button', { name: /Lucía Prueba/ }))
    fireEvent.change(screen.getByLabelText('Fecha del examen'), { target: { value: '2026-11-14' } })
    await user.click(screen.getByRole('button', { name: 'Registrar pago' }))

    expect(screen.getByText('Indica el lugar del examen')).toBeInTheDocument()
    expect(mockRegisterExamPayment).not.toHaveBeenCalled()
  })

  it('blocks paying an exam whose price is missing instead of charging 0,00 €', async () => {
    mockPrices = ALL_PRICES.filter((p) => p.key !== 'examen_dan_2')
    renderModal()
    await user.click(screen.getByRole('button', { name: /Lucía Prueba/ }))

    expect(screen.getByText('Este examen no tiene precio. Avisa a Spain Aikikai.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar pago' })).toBeDisabled()
  })

  it('lets the member be changed after choosing one', async () => {
    renderModal()
    await user.click(screen.getByRole('button', { name: /Lucía Prueba/ }))
    await user.click(screen.getByRole('button', { name: 'Cambiar' }))

    expect(screen.getByLabelText('Buscar miembro')).toBeInTheDocument()
  })
})
