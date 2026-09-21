import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test-utils';
import { MemberAccessBadge } from '../MemberBadges';

describe('MemberAccessBadge', () => {
  it('marks a member that holds a login account', () => {
    renderWithProviders(<MemberAccessBadge hasAccount />);

    expect(screen.getByText('Acceso')).toBeInTheDocument();
  });

  it('renders nothing for a member without an account', () => {
    const { container } = renderWithProviders(<MemberAccessBadge hasAccount={false} />);

    expect(container).toBeEmptyDOMElement();
  });
});
