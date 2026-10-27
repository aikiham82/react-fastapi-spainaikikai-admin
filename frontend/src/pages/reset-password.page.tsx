import { ResetPasswordForm } from "@/features/password-reset/components/ResetPasswordForm"
import { AuthLayout } from "@/features/auth/components/AuthLayout"

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <ResetPasswordForm />
    </AuthLayout>
  )
}
