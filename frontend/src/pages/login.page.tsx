import { LoginForm } from "@/features/auth/components/LoginForm"
import { InstallAppButton } from "@/features/auth/components/InstallAppButton"
import { AuthLayout } from "@/features/auth/components/AuthLayout"

export default function LoginPage() {
  return (
    <AuthLayout title="Entrar" description="Entra para gestionar tu club.">
      <LoginForm />
      <InstallAppButton />
    </AuthLayout>
  )
}
