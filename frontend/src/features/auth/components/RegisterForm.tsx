import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useAuthContext } from "../hooks/useAuthContext";
import { useRegisterMutation } from "../hooks/mutations/useRegister.mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { FormError } from "@/components/ui/form-error";
import { TextLink } from "@/components/ui/text-link";
import { appStorage } from "@/core/data/appStorage";

const MIN_PASSWORD_LENGTH = 8;

type Field = "username" | "email" | "password";
type FieldErrors = Partial<Record<Field, string>>;

// The mutation may surface either the ApiError this app builds or a raw
// axios error, so narrow both shapes instead of trusting one.
const readErrorMessage = (error: unknown): string | undefined => {
  if (typeof error !== "object" || error === null) return undefined;
  const { response, message } = error as {
    response?: { data?: { detail?: string } };
    message?: string;
  };
  return response?.data?.detail ?? message;
};

const validate = (values: Record<Field, string>): FieldErrors => {
  const errors: FieldErrors = {};
  if (values.username.trim().length < 3) {
    errors.username = "El nombre de usuario debe tener al menos 3 caracteres.";
  } else if (!/^[a-zA-Z0-9_-]+$/.test(values.username)) {
    errors.username = "Usa solo letras sin tilde, números, guiones o guiones bajos.";
  }
  if (!/\S+@\S+\.\S+/.test(values.email)) {
    errors.email = "Escribe un correo válido, por ejemplo nombre@club.es.";
  }
  if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  return errors;
};

const errorForDuplicate = (message: string): { field?: Field; text: string } => {
  const lower = message.toLowerCase();
  if (!lower.includes("already exists") && !lower.includes("duplicate")) {
    return { text: "No se ha podido crear la cuenta. Inténtalo de nuevo." };
  }
  if (lower.includes("email")) return { field: "email", text: "Este correo ya tiene una cuenta." };
  if (lower.includes("username")) return { field: "username", text: "Este nombre de usuario ya existe." };
  return { text: "Ya existe una cuenta con estos datos." };
};

export const RegisterForm = () => {
  const { isAuthenticated } = useAuthContext();
  const navigate = useNavigate();
  const { registerMutation, isPending } = useRegisterMutation();

  const [values, setValues] = useState<Record<Field, string>>({ username: "", email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const update = (field: Field) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((current) => ({ ...current, [field]: e.target.value }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    registerMutation(
      { username: values.username.trim(), email: values.email.trim(), password: values.password },
      {
        onSuccess: (response) => {
          const { exp, sub } = jwtDecode(response.access_token) as { exp?: number; sub?: string };
          if (exp) {
            localStorage.setItem("session_expiration", new Date(exp * 1000).toISOString());
          }
          localStorage.setItem("user_email", sub || "");
          appStorage().local.setString("access_token", response.access_token);
          window.location.href = "/";
        },
        onError: (err: unknown) => {
          const { field, text } = errorForDuplicate(readErrorMessage(err) ?? "");
          if (field) {
            setErrors((current) => ({ ...current, [field]: text }));
          } else {
            setServerError(text);
          }
        },
      }
    );
  };

  const fieldError = (field: Field) =>
    errors[field] && (
      <p id={`${field}-error`} className="text-sm text-danger">
        {errors[field]}
      </p>
    );

  return (
    <div className="flex flex-col gap-6">
      <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="username">Nombre de usuario</Label>
          <Input
            id="username"
            autoComplete="username"
            autoCapitalize="none"
            className="h-12 text-base"
            value={values.username}
            onChange={update("username")}
            aria-invalid={Boolean(errors.username)}
            aria-describedby={errors.username ? "username-error" : undefined}
          />
          {fieldError("username")}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            className="h-12 text-base"
            value={values.email}
            onChange={update("email")}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {fieldError("email")}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Contraseña</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={values.password}
            onChange={update("password")}
            aria-invalid={Boolean(errors.password)}
            aria-describedby="password-hint"
          />
          {errors.password ? (
            <p id="password-hint" className="text-sm text-danger">{errors.password}</p>
          ) : (
            <p id="password-hint" className="text-sm text-muted-foreground">Mínimo {MIN_PASSWORD_LENGTH} caracteres.</p>
          )}
        </div>

        {serverError && (
          <FormError>
            {serverError}
          </FormError>
        )}

        <Button type="submit" size="lg" disabled={isPending} className="w-full">
          {isPending ? "Creando cuenta…" : "Crear cuenta"}
        </Button>
      </form>

      <TextLink to="/login">Ya tengo cuenta</TextLink>
    </div>
  );
};
