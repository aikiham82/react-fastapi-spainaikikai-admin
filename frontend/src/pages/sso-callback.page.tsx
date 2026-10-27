import { ClerkProvider } from "@clerk/react"
import { Navigate } from "react-router-dom"
import { SsoCallback } from "@/features/auth/components/SsoCallback"
import { clerkPublishableKey } from "@/core/config/clerk"

export default function SsoCallbackPage() {
  if (!clerkPublishableKey) return <Navigate to="/login" replace />

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <SsoCallback />
    </ClerkProvider>
  )
}
