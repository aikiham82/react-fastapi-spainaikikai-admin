import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test-utils'
import { ClubsPage } from '../clubs.page'

const { isClubAdmin } = vi.hoisted(() => ({ isClubAdmin: vi.fn() }))

vi.mock('@/core/hooks/usePermissions', () => ({
  usePermissions: () => ({ isClubAdmin }),
}))
vi.mock('@/features/clubs/hooks/useClubContext', () => ({
  ClubProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@/features/clubs/components/ClubList', () => ({ ClubList: () => <div>lista de clubes</div> }))
vi.mock('@/features/clubs/components/MyClub', () => ({ MyClub: () => <div>mi club</div> }))

describe('ClubsPage', () => {
  it('shows Mi club for club admins', () => {
    isClubAdmin.mockReturnValue(true)
    renderWithProviders(<ClubsPage />)
    expect(screen.getByText('mi club')).toBeInTheDocument()
    expect(screen.queryByText('lista de clubes')).not.toBeInTheDocument()
  })

  it('keeps the list for super admins', () => {
    isClubAdmin.mockReturnValue(false)
    renderWithProviders(<ClubsPage />)
    expect(screen.getByText('lista de clubes')).toBeInTheDocument()
  })
})
