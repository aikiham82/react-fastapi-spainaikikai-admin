import { ActivateCardForm } from "@/features/auth/components/ActivateCardForm";
import { AuthLayout } from "@/features/auth/components/AuthLayout";

export default function ActivatePage() {
  return (
    <AuthLayout>
      <ActivateCardForm />
    </AuthLayout>
  );
}
