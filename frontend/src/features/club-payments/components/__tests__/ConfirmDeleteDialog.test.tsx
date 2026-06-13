import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { ConfirmDeleteDialog } from '../ConfirmDeleteDialog'

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  isLoading: false,
  title: 'Eliminar pago',
  description: '¿Estás seguro de que quieres eliminar este pago?',
}

describe('ConfirmDeleteDialog', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('when requiresForce is false or absent', () => {
    it('renders the confirm button enabled immediately', () => {
      renderWithProviders(
        <ConfirmDeleteDialog {...defaultProps} requiresForce={false} />
      )

      const confirmBtn = screen.getByRole('button', { name: /eliminar/i })
      expect(confirmBtn).toBeInTheDocument()
      expect(confirmBtn).not.toBeDisabled()
    })

    it('renders the confirm button enabled when requiresForce is not provided', () => {
      renderWithProviders(<ConfirmDeleteDialog {...defaultProps} />)

      const confirmBtn = screen.getByRole('button', { name: /eliminar/i })
      expect(confirmBtn).not.toBeDisabled()
    })

    it('does not render the force confirmation checkbox', () => {
      renderWithProviders(<ConfirmDeleteDialog {...defaultProps} requiresForce={false} />)

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    })
  })

  describe('when requiresForce is true', () => {
    it('renders the confirm button disabled initially', () => {
      renderWithProviders(
        <ConfirmDeleteDialog {...defaultProps} requiresForce={true} />
      )

      const confirmBtn = screen.getByRole('button', { name: /eliminar/i })
      expect(confirmBtn).toBeDisabled()
    })

    it('renders the force confirmation checkbox', () => {
      renderWithProviders(
        <ConfirmDeleteDialog {...defaultProps} requiresForce={true} />
      )

      expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })

    it('enables the confirm button after checking the checkbox', async () => {
      renderWithProviders(
        <ConfirmDeleteDialog {...defaultProps} requiresForce={true} />
      )

      const confirmBtn = screen.getByRole('button', { name: /eliminar/i })
      const checkbox = screen.getByRole('checkbox')

      expect(confirmBtn).toBeDisabled()

      await user.click(checkbox)

      expect(confirmBtn).not.toBeDisabled()
    })

    it('shows the Redsys force confirmation label text', () => {
      renderWithProviders(
        <ConfirmDeleteDialog {...defaultProps} requiresForce={true} />
      )

      expect(
        screen.getByText(/confirmo que quiero eliminar un pago procesado por redsys/i)
      ).toBeInTheDocument()
    })
  })

  describe('clicking the confirm button', () => {
    it('calls onConfirm when confirm button is clicked and enabled', async () => {
      const onConfirm = vi.fn()
      renderWithProviders(
        <ConfirmDeleteDialog {...defaultProps} onConfirm={onConfirm} requiresForce={false} />
      )

      const confirmBtn = screen.getByRole('button', { name: /eliminar/i })
      await user.click(confirmBtn)

      expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it('calls onConfirm when requiresForce is true and checkbox is checked', async () => {
      const onConfirm = vi.fn()
      renderWithProviders(
        <ConfirmDeleteDialog {...defaultProps} onConfirm={onConfirm} requiresForce={true} />
      )

      await user.click(screen.getByRole('checkbox'))
      await user.click(screen.getByRole('button', { name: /eliminar/i }))

      expect(onConfirm).toHaveBeenCalledTimes(1)
    })
  })

  describe('when isLoading is true', () => {
    it('disables the confirm button while loading', () => {
      renderWithProviders(
        <ConfirmDeleteDialog {...defaultProps} isLoading={true} requiresForce={false} />
      )

      const confirmBtn = screen.getByRole('button', { name: /eliminar/i })
      expect(confirmBtn).toBeDisabled()
    })

    it('disables the cancel button while loading', () => {
      renderWithProviders(
        <ConfirmDeleteDialog {...defaultProps} isLoading={true} />
      )

      const cancelBtn = screen.getByRole('button', { name: /cancelar/i })
      expect(cancelBtn).toBeDisabled()
    })
  })

  describe('cancel button', () => {
    it('calls onClose when cancel is clicked', async () => {
      const onClose = vi.fn()
      renderWithProviders(
        <ConfirmDeleteDialog {...defaultProps} onClose={onClose} />
      )

      await user.click(screen.getByRole('button', { name: /cancelar/i }))

      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('when isOpen is false', () => {
    it('does not render the dialog content', () => {
      renderWithProviders(
        <ConfirmDeleteDialog {...defaultProps} isOpen={false} />
      )

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })

    it('does not render title when closed', () => {
      renderWithProviders(
        <ConfirmDeleteDialog {...defaultProps} isOpen={false} />
      )

      expect(screen.queryByText('Eliminar pago')).not.toBeInTheDocument()
    })
  })

  describe('content rendering', () => {
    it('renders the title and description props', () => {
      renderWithProviders(
        <ConfirmDeleteDialog
          {...defaultProps}
          title="Eliminar pago manual"
          description="Esta acción no se puede deshacer."
        />
      )

      expect(screen.getByText('Eliminar pago manual')).toBeInTheDocument()
      expect(screen.getByText('Esta acción no se puede deshacer.')).toBeInTheDocument()
    })
  })
})
