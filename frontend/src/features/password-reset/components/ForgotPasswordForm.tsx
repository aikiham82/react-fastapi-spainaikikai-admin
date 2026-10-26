import { useState } from "react";
import { Link } from "react-router-dom";
import { useRequestPasswordResetMutation } from "../hooks/mutations/useRequestPasswordReset.mutation";
import { AuthHeading } from "@/features/auth/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";
import { TextLink, TextButton } from "@/components/ui/text-link";

export const ForgotPasswordForm = () => {
  const [identifier, setIdentifier] = useState("");
  const { requestResetAsync, isLoading, isSuccess, error, data, reset } =
    useRequestPasswordResetMutation();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await requestResetAsync({ identifier });
    } catch {
      // Error is handled by the mutation
    }
  };

  const startAgain = () => {
    reset();
    setIdentifier("");
  };

  if (isSuccess && data && !data.success) {
    return (
      <div className="flex flex-col gap-6">
        <AuthHeading title="No se ha podido enviar">{data.message}</AuthHeading>
        <Button size="lg" variant="outline" className="w-full" onClick={() => reset()}>
          Intentar de nuevo
        </Button>
        <TextLink to="/login">
          Volver a entrar
        </TextLink>
      </div>
    );
  }

  if (isSuccess && data?.success) {
    return (
      <div className="flex flex-col gap-6">
        <AuthHeading title="Revisa tu correo">
          <p>
            Si existe una cuenta, te hemos enviado un enlace al correo registrado en ella. Si no sabes cuál es,
            pregúntale a la Federación.
          </p>
          <p className="mt-3">El enlace caduca en 24 horas.</p>
        </AuthHeading>
        <Button size="lg" className="w-full" asChild>
          <Link to="/login">Volver a entrar</Link>
        </Button>
        <TextButton onClick={startAgain}>
          Probar con otra cuenta
        </TextButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading title="Recuperar la contraseña">
        Escribe tu correo o tu nombre de usuario y te enviaremos un enlace para crear una contraseña nueva.
      </AuthHeading>

      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="identifier">Correo o nombre de usuario</Label>
          <Input
            id="identifier"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="h-12 text-base"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </div>

        {error && (
          <FormError>
            Ha ocurrido un error. Inténtalo de nuevo.
          </FormError>
        )}

        <Button type="submit" size="lg" disabled={isLoading || !identifier.trim()} className="w-full">
          {isLoading ? "Enviando…" : "Enviar enlace"}
        </Button>
      </form>

      <TextLink to="/login">
        Volver a entrar
      </TextLink>
    </div>
  );
};
