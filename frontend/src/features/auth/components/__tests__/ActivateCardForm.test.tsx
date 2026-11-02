import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, userEvent } from '@/test-utils';
import { authService } from '../../data/auth.service';
import { ActivateCardForm } from '../ActivateCardForm';

const SERVER_ANSWER = 'Si tu correo está en tu ficha de miembro, te llegará un enlace para activar tu carné.';

describe('ActivateCardForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('asks for the card with the email and shows the answer of the server', async () => {
    const request = vi.spyOn(authService, 'requestCardAccess').mockResolvedValue({ message: SERVER_ANSWER });
    renderWithProviders(<ActivateCardForm />);

    await userEvent.type(screen.getByLabelText('Correo de tu ficha'), 'ana@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));

    expect(await screen.findByText(SERVER_ANSWER)).toBeInTheDocument();
    expect(request).toHaveBeenCalledWith('ana@example.com');
    expect(screen.getByRole('link', { name: 'Volver a entrar' })).toHaveAttribute('href', '/login');
  });

  it('lets the member try again when the request fails', async () => {
    vi.spyOn(authService, 'requestCardAccess').mockRejectedValue(new Error('network'));
    renderWithProviders(<ActivateCardForm />);

    await userEvent.type(screen.getByLabelText('Correo de tu ficha'), 'ana@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));

    expect(await screen.findByText('No se ha podido enviar. Inténtalo de nuevo.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar enlace' })).toBeEnabled();
  });
});
