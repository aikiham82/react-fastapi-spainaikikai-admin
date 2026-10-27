import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClubMark } from '../ClubMark'

describe('ClubMark', () => {
  it('shows the club logo when the club has one', () => {
    render(<ClubMark clubName="Club Aikido Ejemplo" logoUrl="/uploads/clubs/c1.jpg?v=1" />)

    expect(screen.getByRole('img', { name: 'Club Aikido Ejemplo' })).toHaveAttribute(
      'src',
      expect.stringMatching(/\/uploads\/clubs\/c1\.jpg\?v=1$/)
    )
  })

  it('falls back to the club initials without a logo', () => {
    render(<ClubMark clubName="Aikido Dojo Central Madrid" />)

    expect(screen.getByRole('img', { name: 'Aikido Dojo Central Madrid' })).toHaveTextContent('CM')
  })

  it('skips the words every club shares so two clubs do not look alike', () => {
    render(<ClubMark clubName="Asociación Deportiva Aikido Tradicional X" />)

    expect(screen.getByRole('img', { name: 'Asociación Deportiva Aikido Tradicional X' })).toHaveTextContent('TX')
  })

  it('keeps the plain initials when every word is generic', () => {
    render(<ClubMark clubName="Club Aikido" />)

    expect(screen.getByRole('img', { name: 'Club Aikido' })).toHaveTextContent('CA')
  })
})
