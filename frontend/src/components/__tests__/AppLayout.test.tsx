import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../AppLayout';

vi.mock('@/features/auth/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ isAuthenticated: true, isLoading: false, userRole: null }),
}));

describe('AppLayout', () => {
  it('sends a member who manages nothing to their card', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<p>panel</p>} />
          </Route>
          <Route path="/card" element={<p>card page</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('card page')).toBeInTheDocument();
    expect(screen.queryByText('panel')).not.toBeInTheDocument();
  });
});
