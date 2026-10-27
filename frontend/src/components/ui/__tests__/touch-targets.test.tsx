import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TextButton } from '../text-link'
import { RowActions } from '../list-controls'

describe('touch targets reach 44px on touch screens', () => {
  it('an inline text button', () => {
    render(<TextButton variant="inline">Marcar todas</TextButton>)
    expect(screen.getByRole('button', { name: 'Marcar todas' })).toHaveClass('pointer-coarse:min-h-11')
  })

  it('a row menu item', async () => {
    render(<RowActions label="Club Ejemplo" actions={[{ label: 'Dar de baja', onSelect: () => {} }]} />)
    await userEvent.click(screen.getByRole('button', { name: 'Acciones de Club Ejemplo' }))
    expect(screen.getByRole('menuitem', { name: 'Dar de baja' })).toHaveClass('pointer-coarse:min-h-11')
  })
})
