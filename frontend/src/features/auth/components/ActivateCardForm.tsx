import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TextLink } from "@/components/ui/text-link";
import { useRequestCardAccessMutation } from "../hooks/mutations/useRequestCardAccess.mutation";
import { AuthHeading } from "./AuthLayout";

export const ActivateCardForm = () => {
  const [email, setEmail] = useState("");
  const { requestCardAccess, isLoading, isError, answer } = useRequestCardAccessMutation();

  if (answer) {
    return (
      <div className="flex flex-col gap-6">
        <AuthHeading title="Revisa tu correo">{answer}</AuthHeading>
        <Button size="lg" className="w-full" asChild>
          <Link to="/login">Volver a entrar</Link>
        </Button>
      </div>
    );
  }

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    requestCardAccess(email.trim());
  };

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading title="Activa tu carné">
        Pon el correo de tu ficha del club y te enviamos un enlace para crear tu contraseña.
      </AuthHeading>

      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="card-email">Correo de tu ficha</Label>
          <Input
            id="card-email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            className="h-12 text-base"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        {isError && <FormError>No se ha podido enviar. Inténtalo de nuevo.</FormError>}

        <Button type="submit" size="lg" disabled={isLoading} className="w-full">
          {isLoading ? "Enviando…" : "Enviar enlace"}
        </Button>
      </form>

      <TextLink to="/login">Volver a entrar</TextLink>
    </div>
  );
};
