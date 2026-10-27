import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test-utils';
import { NoOwnEmailBadge } from '../MemberBadges';

describe('NoOwnEmailBadge', () => {
  it('warns that a member without an email of their own cannot see their card', () => {
    renderWithProviders(<NoOwnEmailBadge hasOwnEmail={false} />);

    expect(screen.getByText('Sin correo propio: no puede ver su carné')).toBeInTheDocument();
  });

  it.each([true, undefined])('renders nothing when the email is their own or unknown (%s)', (hasOwnEmail) => {
    const { container } = renderWithProviders(<NoOwnEmailBadge hasOwnEmail={hasOwnEmail} />);

    expect(container).toBeEmptyDOMElement();
  });
});
