import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useValidateTokenQuery } from "../hooks/queries/useValidateToken.query";
import { useResetPasswordMutation } from "../hooks/mutations/useResetPassword.mutation";
import { AuthHeading } from "@/features/auth/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

const MIN_PASSWORD_LENGTH = 8;

const linkClasses =
  "flex min-h-11 w-fit items-center text-[15px] text-foreground underline underline-offset-4 hover:text-primary";

export const ResetPasswordForm = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState("");

  const { data: tokenData, isLoading: isValidating, isError: isTokenInvalid } = useValidateTokenQuery(token);
  const { resetPasswordAsync, isLoading: isResetting, isSuccess, error } = useResetPasswordMutation();

  const validatePasswords = (): boolean => {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setValidationError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return false;
    }
    if (newPassword !== confirmPassword) {
      setValidationError("Las dos contraseñas no coinciden.");
      return false;
    }
    setValidationError("");
    return true;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePasswords() || !token) return;

    try {
      await resetPasswordAsync({ token, new_password: newPassword });
    } catch {
      // Error is handled by the mutation
    }
  };

  if (isValidating) {
    return <p className="text-[15px] text-muted-foreground">Comprobando el enlace…</p>;
  }

  if (isTokenInvalid || !token) {
    return (
      <div className="flex flex-col gap-6">
        <AuthHeading title="Este enlace ya no sirve">
          El enlace para cambiar la contraseña ha caducado o ya se ha usado. Pide uno nuevo.
        </AuthHeading>
        <Button size="lg" className="w-full" asChild>
          <Link to="/forgot-password">Pedir un enlace nuevo</Link>
        </Button>
        <Link to="/login" className={linkClasses}>
          Volver a entrar
        </Link>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col gap-6">
        <AuthHeading title="Contraseña cambiada">Ya puedes entrar con tu contraseña nueva.</AuthHeading>
        <Button size="lg" className="w-full" asChild>
          <Link to="/login">Entrar</Link>
        </Button>
      </div>
    );
  }

  const formError = validationError || (error ? "Ha ocurrido un error. Inténtalo de nuevo." : "");

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading title="Nueva contraseña">
        {tokenData?.email ? (
          <>
            Para la cuenta <strong className="font-medium text-foreground">{tokenData.email}</strong>.
          </>
        ) : (
          "Elige una contraseña que recuerdes."
        )}
      </AuthHeading>

      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="newPassword">Contraseña nueva</Label>
          <PasswordInput
            id="newPassword"
            autoComplete="new-password"
            required
            value={newPassword}
            aria-describedby="password-rule"
            onChange={(e) => {
              setNewPassword(e.target.value);
              setValidationError("");
            }}
          />
          <p id="password-rule" className="text-sm text-muted-foreground">
            Mínimo {MIN_PASSWORD_LENGTH} caracteres.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmPassword">Repite la contraseña</Label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setValidationError("");
            }}
          />
        </div>

        {formError && (
          <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" disabled={isResetting} className="w-full">
          {isResetting ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </form>

      <Link to="/login" className={linkClasses}>
        Volver a entrar
      </Link>
    </div>
  );
};
