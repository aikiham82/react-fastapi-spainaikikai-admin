import { ForgotPasswordForm } from "@/features/password-reset/components/ForgotPasswordForm"
import { AuthLayout } from "@/features/auth/components/AuthLayout"

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  )
}
