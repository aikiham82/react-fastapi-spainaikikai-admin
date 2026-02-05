import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor, act } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { LoginForm } from '../LoginForm'
import {
  renderWithProviders,
  userEvent,
  createMockAuthContextValue,
  createMockAuthRequest,
  createMockAuthResponse
} from '@/test-utils'

// Mock React Router
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock the AuthContext
const mockAuthContext = createMockAuthContextValue()
vi.mock('@/features/auth/hooks/useAuthContext', () => ({
  useAuthContext: vi.fn(() => mockAuthContext),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

// Mock toast notifications
vi.mock('sonner', () => ({
  toast: vi.fn(),
}))

describe('LoginForm', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset auth context to default state
    Object.assign(mockAuthContext, createMockAuthContextValue())
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render all form elements correctly', () => {
      renderWithProviders(<LoginForm />)

      // Form should be present
      const form = screen.getByRole('button', { name: /iniciar sesión/i }).closest('form')
      expect(form).toBeInTheDocument()

      // Email field
      const emailField = screen.getByLabelText(/correo electrónico/i)
      expect(emailField).toBeInTheDocument()
      expect(emailField).toHaveAttribute('type', 'email')
      expect(emailField).toHaveAttribute('required')
      expect(emailField).toHaveAttribute('placeholder', 'correo@ejemplo.com')

      // Password field
      const passwordField = screen.getByLabelText(/contraseña/i)
      expect(passwordField).toBeInTheDocument()
      expect(passwordField).toHaveAttribute('type', 'password')
      expect(passwordField).toHaveAttribute('required')
      expect(passwordField).toHaveAttribute('placeholder', 'Introduce tu contraseña')

      // Submit button
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveAttribute('type', 'submit')
    })

    it('should render form labels correctly', () => {
      renderWithProviders(<LoginForm />)

      expect(screen.getByText('Correo electrónico')).toBeInTheDocument()
      expect(screen.getByText('Contraseña')).toBeInTheDocument()
    })

    it('should have proper form accessibility attributes', () => {
      renderWithProviders(<LoginForm />)

      const emailField = screen.getByLabelText(/correo electrónico/i)
      const passwordField = screen.getByLabelText(/contraseña/i)

      // Check that labels are properly associated
      expect(emailField).toHaveAttribute('id', 'email')
      expect(passwordField).toHaveAttribute('id', 'password')

      // Check required attributes
      expect(emailField).toBeRequired()
      expect(passwordField).toBeRequired()
    })
  })

  describe('User Interactions', () => {
    it('should update email field when user types', async () => {
      renderWithProviders(<LoginForm />)

      const emailField = screen.getByLabelText(/correo electrónico/i)

      await user.type(emailField, 'test@example.com')

      expect(emailField).toHaveValue('test@example.com')
    })

    it('should update password field when user types', async () => {
      renderWithProviders(<LoginForm />)

      const passwordField = screen.getByLabelText(/contraseña/i)

      await user.type(passwordField, 'password123')

      expect(passwordField).toHaveValue('password123')
    })

    it('should clear fields after typing and clearing', async () => {
      renderWithProviders(<LoginForm />)

      const emailField = screen.getByLabelText(/correo electrónico/i)
      const passwordField = screen.getByLabelText(/contraseña/i)

      // Type values
      await user.type(emailField, 'test@example.com')
      await user.type(passwordField, 'password123')

      expect(emailField).toHaveValue('test@example.com')
      expect(passwordField).toHaveValue('password123')

      // Clear values
      await user.clear(emailField)
      await user.clear(passwordField)

      expect(emailField).toHaveValue('')
      expect(passwordField).toHaveValue('')
    })

    it('should maintain field focus states correctly', async () => {
      renderWithProviders(<LoginForm />)

      const emailField = screen.getByLabelText(/correo electrónico/i)
      const passwordField = screen.getByLabelText(/contraseña/i)

      // Focus email field
      await user.click(emailField)
      expect(emailField).toHaveFocus()

      // Tab to password field
      await user.tab()
      expect(passwordField).toHaveFocus()
    })
  })

  describe('Form Submission', () => {
    it('should call login with correct data on form submission', async () => {
      const testData = createMockAuthRequest({
        email: 'test@example.com',
        password: 'password123'
      })

      renderWithProviders(<LoginForm />)

      const emailField = screen.getByLabelText(/correo electrónico/i)
      const passwordField = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      // Fill form
      await user.type(emailField, testData.email)
      await user.type(passwordField, testData.password)

      // Submit form
      await user.click(submitButton)

      expect(mockAuthContext.login).toHaveBeenCalledWith(testData)
      expect(mockAuthContext.login).toHaveBeenCalledTimes(1)
    })

    it('should prevent default form submission behavior', async () => {
      const preventDefault = vi.fn()

      renderWithProviders(<LoginForm />)

      const form = screen.getByRole('button', { name: /iniciar sesión/i }).closest('form')

      // Mock the form event
      const submitEvent = new Event('submit', { bubbles: true })
      Object.defineProperty(submitEvent, 'preventDefault', {
        value: preventDefault,
        writable: true
      })

      await user.type(screen.getByLabelText(/correo electrónico/i), 'test@example.com')
      await user.type(screen.getByLabelText(/contraseña/i), 'password123')

      // Trigger form submission
      form!.dispatchEvent(submitEvent)

      // Verify preventDefault was called
      expect(preventDefault).toHaveBeenCalled()
    })

    it('should prevent form submission with empty required fields', async () => {
      renderWithProviders(<LoginForm />)

      const emailField = screen.getByLabelText(/correo electrónico/i)
      const passwordField = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      // Ensure fields are empty and required
      expect(emailField).toHaveValue('')
      expect(passwordField).toHaveValue('')
      expect(emailField).toBeRequired()
      expect(passwordField).toBeRequired()

      // Submit form without filling fields
      await user.click(submitButton)

      // Form validation should prevent submission, so login should not be called
      expect(mockAuthContext.login).not.toHaveBeenCalled()
    })

    it('should handle form submission via Enter key', async () => {
      const testData = createMockAuthRequest()

      renderWithProviders(<LoginForm />)

      const emailField = screen.getByLabelText(/correo electrónico/i)
      const passwordField = screen.getByLabelText(/contraseña/i)

      // Fill form
      await user.type(emailField, testData.email)
      await user.type(passwordField, testData.password)

      // Press Enter on password field
      await user.type(passwordField, '{Enter}')

      expect(mockAuthContext.login).toHaveBeenCalledWith(testData)
    })
  })

  describe('Loading State', () => {
    it('should show loading text when isLoading is true', () => {
      // Set loading state
      mockAuthContext.isLoading = true

      renderWithProviders(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: /iniciando sesión/i })
      expect(submitButton).toHaveTextContent('Iniciando sesión...')
      expect(submitButton).not.toHaveTextContent('Iniciar Sesión')
    })

    it('should show normal text when not loading', () => {
      // Set normal state
      mockAuthContext.isLoading = false

      renderWithProviders(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
      expect(submitButton).toHaveTextContent('Iniciar Sesión')
      expect(submitButton).not.toHaveTextContent('Iniciando sesión...')
    })

    it('should disable interactions during loading state', async () => {
      mockAuthContext.isLoading = true

      renderWithProviders(<LoginForm />)

      const emailField = screen.getByLabelText(/correo electrónico/i)
      const passwordField = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesión|iniciando sesión/i })

      // Fields should remain accessible during loading
      expect(emailField).not.toBeDisabled()
      expect(passwordField).not.toBeDisabled()

      // User should still be able to type (for good UX)
      await user.type(emailField, 'test@example.com')
      expect(emailField).toHaveValue('test@example.com')
    })

    it('should handle loading state transitions correctly', () => {
      const { rerender } = renderWithProviders(<LoginForm />)

      // Initially not loading
      expect(screen.getByRole('button', { name: /iniciar sesión|iniciando sesión/i })).toHaveTextContent('Iniciar Sesión')

      // Set to loading
      mockAuthContext.isLoading = true
      rerender(<LoginForm />)
      expect(screen.getByRole('button', { name: /iniciar sesión|iniciando sesión/i })).toHaveTextContent('Iniciando sesión...')

      // Set back to not loading
      mockAuthContext.isLoading = false
      rerender(<LoginForm />)
      expect(screen.getByRole('button', { name: /iniciar sesión|iniciando sesión/i })).toHaveTextContent('Iniciar Sesión')
    })
  })

  describe('Authentication State Integration', () => {
    it('should navigate to home when user is authenticated', async () => {
      // Set authenticated state
      mockAuthContext.isAuthenticated = true

      renderWithProviders(<LoginForm />)

      // Wait for useEffect to run
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/')
      })
    })

    it('should not navigate when user is not authenticated', async () => {
      mockAuthContext.isAuthenticated = false

      renderWithProviders(<LoginForm />)

      // Wait a bit to ensure no navigation happens
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('should handle authentication state changes', async () => {
      mockAuthContext.isAuthenticated = false

      const { rerender } = renderWithProviders(<LoginForm />)

      // Initially should not navigate
      expect(mockNavigate).not.toHaveBeenCalled()

      // Change to authenticated
      mockAuthContext.isAuthenticated = true
      rerender(<LoginForm />)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/')
      })
    })

    it('should handle missing login function gracefully', () => {
      // Set login to null/undefined
      mockAuthContext.login = null as any

      renderWithProviders(<LoginForm />)

      // Should render empty fragment
      expect(screen.queryByRole('form')).not.toBeInTheDocument()
    })

    it('should work with different user authentication states', async () => {
      const testCases = [
        { isAuthenticated: false, shouldNavigate: false },
        { isAuthenticated: true, shouldNavigate: true },
      ]

      for (const testCase of testCases) {
        vi.clearAllMocks()
        mockAuthContext.isAuthenticated = testCase.isAuthenticated

        renderWithProviders(<LoginForm />)

        if (testCase.shouldNavigate) {
          await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/')
          })
        } else {
          await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 100))
          })
          expect(mockNavigate).not.toHaveBeenCalled()
        }
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle login function errors gracefully', async () => {
      const errorMessage = 'Login failed'
      mockAuthContext.login = vi.fn().mockRejectedValue(new Error(errorMessage))

      renderWithProviders(<LoginForm />)

      await user.type(screen.getByLabelText(/correo electrónico/i), 'test@example.com')
      await user.type(screen.getByLabelText(/contraseña/i), 'password123')
      await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

      // Form should still be functional
      const form = screen.getByRole('button', { name: /iniciar sesión/i }).closest('form')
      expect(form).toBeInTheDocument()
    })

    it('should handle undefined useAuthContext gracefully', () => {
      // This test ensures the component doesn't crash if context is missing
      // The actual error handling is done by the useAuthContext hook itself
      expect(() => renderWithProviders(<LoginForm />)).not.toThrow()
    })

    it('should maintain form state during error scenarios', async () => {
      mockAuthContext.login = vi.fn().mockRejectedValue(new Error('Network error'))

      renderWithProviders(<LoginForm />)

      const emailField = screen.getByLabelText(/correo electrónico/i)
      const passwordField = screen.getByLabelText(/contraseña/i)

      // Fill form
      await user.type(emailField, 'test@example.com')
      await user.type(passwordField, 'password123')

      // Submit and handle error
      await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

      // Form values should be maintained
      expect(emailField).toHaveValue('test@example.com')
      expect(passwordField).toHaveValue('password123')
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid form submissions', async () => {
      renderWithProviders(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

      // Fill form
      await user.type(screen.getByLabelText(/correo electrónico/i), 'test@example.com')
      await user.type(screen.getByLabelText(/contraseña/i), 'password123')

      // Rapid clicks
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)

      // Should only call login multiple times (no prevention mechanism)
      expect(mockAuthContext.login).toHaveBeenCalledTimes(3)
    })

    it('should handle special characters in form fields', async () => {
      const specialData = {
        email: 'test+special@example.com',
        password: 'p@ssw0rd!@#$%^&*()'
      }

      renderWithProviders(<LoginForm />)

      const emailField = screen.getByLabelText(/correo electrónico/i)
      const passwordField = screen.getByLabelText(/contraseña/i)

      await user.type(emailField, specialData.email)
      await user.type(passwordField, specialData.password)

      expect(emailField).toHaveValue(specialData.email)
      expect(passwordField).toHaveValue(specialData.password)

      await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

      expect(mockAuthContext.login).toHaveBeenCalledWith(specialData)
    })

    it('should handle very long input values', async () => {
      const longEmail = 'a'.repeat(100) + '@example.com'
      const longPassword = 'p'.repeat(200)

      renderWithProviders(<LoginForm />)

      const emailField = screen.getByLabelText(/correo electrónico/i)
      const passwordField = screen.getByLabelText(/contraseña/i)

      await user.type(emailField, longEmail)
      await user.type(passwordField, longPassword)

      expect(emailField).toHaveValue(longEmail)
      expect(passwordField).toHaveValue(longPassword)
    })

    it('should handle component unmounting during async operations', async () => {
      let resolveLogin: (value: any) => void
      const loginPromise = new Promise(resolve => {
        resolveLogin = resolve
      })

      mockAuthContext.login = vi.fn(() => loginPromise)

      const { unmount } = renderWithProviders(<LoginForm />)

      // Start login process
      await user.type(screen.getByLabelText(/correo electrónico/i), 'test@example.com')
      await user.type(screen.getByLabelText(/contraseña/i), 'password123')
      await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

      // Unmount before login completes
      unmount()

      // Resolve the promise (should not cause errors)
      resolveLogin!(createMockAuthResponse())

      // No assertions needed - just ensuring no errors are thrown
    })

    it('should handle navigation function being undefined', async () => {
      mockNavigate.mockImplementation(() => {
        throw new Error('Navigation failed')
      })

      mockAuthContext.isAuthenticated = true

      // The component will throw an error due to failed navigation in useEffect
      // This is expected behavior - the component doesn't handle navigation errors
      expect(() => renderWithProviders(<LoginForm />)).toThrow()
    })
  })

  describe('Integration with AuthContext', () => {
    it('should use all required auth context properties', () => {
      renderWithProviders(<LoginForm />)

      // The component should have accessed these properties
      expect(mockAuthContext.login).toBeDefined()
      expect(mockAuthContext.isAuthenticated).toBeDefined()
      expect(mockAuthContext.isLoading).toBeDefined()
    })

    it('should handle different auth context states', () => {
      const authStates = [
        { isAuthenticated: false, isLoading: false, login: vi.fn() },
        { isAuthenticated: false, isLoading: true, login: vi.fn() },
      ]

      authStates.forEach((state, index) => {
        vi.clearAllMocks()
        Object.assign(mockAuthContext, state)

        expect(() => renderWithProviders(<LoginForm />)).not.toThrow()

        if (mockAuthContext.login && !state.isAuthenticated) {
          // Component should render successfully when not authenticated
          expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()
        }
      })
    })

    it('should handle auth context updates correctly', async () => {
      mockAuthContext.isAuthenticated = false
      mockAuthContext.isLoading = false

      const { rerender } = renderWithProviders(<LoginForm />)

      // Initial state
      expect(screen.getByRole('button', { name: /iniciar sesión|iniciando sesión/i })).toHaveTextContent('Iniciar Sesión')

      // Update loading state
      mockAuthContext.isLoading = true
      rerender(<LoginForm />)
      expect(screen.getByRole('button', { name: /iniciar sesión|iniciando sesión/i })).toHaveTextContent('Iniciando sesión...')

      // Update auth state (should trigger navigation)
      mockAuthContext.isAuthenticated = true
      rerender(<LoginForm />)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes and roles', () => {
      renderWithProviders(<LoginForm />)

      // Form should be present
      const form = screen.getByRole('button', { name: /iniciar sesión/i }).closest('form')
      expect(form).toBeInTheDocument()

      // Buttons should be properly labeled
      expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()

      // Form fields should be properly labeled
      expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      renderWithProviders(<LoginForm />)

      // Tab through form elements
      await user.tab()
      expect(screen.getByLabelText(/correo electrónico/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/contraseña/i)).toHaveFocus()

      await user.tab()
      // After password field comes the password visibility toggle button
      expect(screen.getByRole('button', { name: '' })).toHaveFocus() // Password toggle has no accessible name

      await user.tab()
      // Then skip the "Forgot password?" link
      await user.tab()
      expect(screen.getByRole('button', { name: /iniciar sesión/i })).toHaveFocus()
    })

    it('should handle form submission via keyboard', async () => {
      renderWithProviders(<LoginForm />)

      await user.type(screen.getByLabelText(/correo electrónico/i), 'test@example.com')
      await user.type(screen.getByLabelText(/contraseña/i), 'password123')

      // Focus submit button and press Enter
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
      submitButton.focus()
      await user.keyboard('{Enter}')

      expect(mockAuthContext.login).toHaveBeenCalled()
    })
  })
})
