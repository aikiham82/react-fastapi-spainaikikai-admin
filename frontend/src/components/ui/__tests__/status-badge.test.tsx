import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge, type StatusTone } from '../status-badge'

describe('StatusBadge', () => {
  it.each<[StatusTone, string]>([
    ['ok', 'Al día'],
    ['warn', 'Caduca pronto'],
    ['bad', 'Caducada'],
    ['neutral', 'Pendiente'],
  ])('renders the label next to the colour for the %s status', (tone, label) => {
    render(<StatusBadge tone={tone}>{label}</StatusBadge>)

    const badge = screen.getByText(label)
    expect(badge).toHaveAttribute('data-tone', tone)
  })
})
