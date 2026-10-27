import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Avatar, AvatarStack, BeltBadge, IconTile, ProgressBar, ProgressRing, TickChip } from '../graphic'
import { StatusBadge } from '../status-badge'
import { Users } from 'lucide-react'

describe('Avatar', () => {
  it('shows the initials and names the person', () => {
    render(<Avatar name="Lucía Herrero" />)
    expect(screen.getByRole('img', { name: 'Lucía Herrero' })).toHaveTextContent('LH')
  })

  it('gives the same person the same colour every time', () => {
    const { container, rerender } = render(<Avatar name="Marcos Ibarra" />)
    const first = container.firstElementChild?.getAttribute('data-tint')
    rerender(<Avatar name="Marcos Ibarra" />)
    expect(container.firstElementChild?.getAttribute('data-tint')).toBe(first)
  })

  it('stacks a few avatars and counts the rest', () => {
    render(<AvatarStack names={['Ana Uno', 'Beto Dos', 'Ciro Tres', 'Dora Cuatro']} max={3} />)
    expect(screen.getByText('+1')).toBeInTheDocument()
  })
})

describe('BeltBadge', () => {
  it('draws a dan grade as a black belt in Spanish', () => {
    render(<BeltBadge grade="4th Dan" />)
    expect(screen.getByText('4.º Dan')).toHaveAttribute('data-belt', 'dan')
  })

  it('draws a kyu grade as a white belt', () => {
    render(<BeltBadge grade="1st Kyu" />)
    expect(screen.getByText('1.er Kyu')).toHaveAttribute('data-belt', 'kyu')
  })

  it('adds the instructor title as its own red badge', () => {
    render(<BeltBadge grade="3rd Dan" title="shidoin" />)
    expect(screen.getByText('Shidoin')).toHaveAttribute('data-belt', 'title')
  })

  it('says Sin grado when there is none', () => {
    render(<BeltBadge grade={null} />)
    expect(screen.getByText('Sin grado')).toBeInTheDocument()
  })
})

describe('StatusBadge', () => {
  it('pairs every tone with an icon so colour is never the only signal', () => {
    const { container } = render(<StatusBadge tone="bad">Caducada</StatusBadge>)
    expect(container.querySelector('svg')).not.toBeNull()
  })
})

describe('ProgressRing and ProgressBar', () => {
  it('reports progress to assistive technology', () => {
    render(
      <>
        <ProgressRing value={18} max={23} label="Licencias al día" />
        <ProgressBar value={12} max={30} label="Plazas ocupadas" />
      </>
    )
    expect(screen.getByRole('progressbar', { name: 'Licencias al día' })).toHaveAttribute('aria-valuenow', '18')
    expect(screen.getByRole('progressbar', { name: 'Plazas ocupadas' })).toHaveAttribute('aria-valuemax', '30')
  })

  it('shows the percentage inside the ring', () => {
    render(<ProgressRing value={18} max={23} label="Licencias al día" />)
    expect(screen.getByText('78%')).toBeInTheDocument()
  })
})

describe('IconTile', () => {
  it('renders the icon in a tinted tile', () => {
    const { container } = render(<IconTile icon={Users} tone="bad" />)
    expect(container.firstElementChild).toHaveAttribute('data-tone', 'bad')
  })
})

describe('TickChip', () => {
  it('toggles and shows its price', async () => {
    const onChange = vi.fn()
    render(<TickChip label="Licencia Dan" price="40,00 €" checked={false} onCheckedChange={onChange} />)

    const chip = screen.getByRole('checkbox', { name: /licencia dan/i })
    expect(chip).toHaveTextContent('40,00 €')
    await userEvent.click(chip)

    expect(onChange).toHaveBeenCalledWith(true)
  })
})
