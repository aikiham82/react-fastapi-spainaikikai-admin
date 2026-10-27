import { RegisterForm } from "@/features/auth/components/RegisterForm"
import { AuthLayout } from "@/features/auth/components/AuthLayout"

export default function RegisterPage() {
  return (
    <AuthLayout title="Crear cuenta" description="Para miembros de clubs de Spain Aikikai.">
      <RegisterForm />
    </AuthLayout>
  )
}
