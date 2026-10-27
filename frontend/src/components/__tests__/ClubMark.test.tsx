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
    render(<ClubMark clubName="Club Aikido Ejemplo" />)

    expect(screen.getByRole('img', { name: 'Club Aikido Ejemplo' })).toHaveTextContent('CA')
  })
})
