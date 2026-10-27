import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test-utils'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../dialog'

describe('DialogContent', () => {
  it('focuses the first field without selecting its text', async () => {
    renderWithProviders(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Editar</DialogTitle>
          <DialogDescription>Datos</DialogDescription>
          <input aria-label="Nombre" defaultValue="Aikido Ejemplo" />
          <input aria-label="Ciudad" defaultValue="Madrid" />
        </DialogContent>
      </Dialog>
    )

    const first = screen.getByLabelText('Nombre') as HTMLInputElement
    await waitFor(() => expect(first).toHaveFocus())
    expect(first.selectionStart).toBe(first.value.length)
    expect(first.selectionEnd).toBe(first.value.length)
  })

  it('keeps focus inside the dialog when it has no field', async () => {
    renderWithProviders(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Detalle</DialogTitle>
          <DialogDescription>Datos</DialogDescription>
          <button type="button">Aceptar</button>
        </DialogContent>
      </Dialog>
    )

    const dialog = screen.getByRole('dialog')
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
  })
})
