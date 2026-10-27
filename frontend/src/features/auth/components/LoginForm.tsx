import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthContext } from "../hooks/useAuthContext";
import { GoogleSignIn } from "./GoogleSignIn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { FormError } from "@/components/ui/form-error";
import { TextLink } from "@/components/ui/text-link";

const LOGIN_FAILURE_MESSAGES = {
  invalid: "El correo o la contraseña no son correctos.",
  rate_limited: "Demasiados intentos. Espera un momento y vuelve a probar.",
  unavailable: "No hemos podido conectar. Inténtalo de nuevo en unos minutos.",
} as const;

const GOOGLE_FAILURE_MESSAGE = "No hemos podido entrar con Google. Usa el correo con el que tu club te dio acceso.";

export const LoginForm = () => {
  const { login, isAuthenticated, isLoading, loginFailure } = useAuthContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const googleFailed = searchParams.get("google") === "failed";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    login({ email, password });
  };

  if (!login) {
    return <></>;
  }

  return (
    <div className="flex flex-col gap-6">
      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Correo o nombre de usuario
          </Label>
          <Input
            id="email"
            type="text"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="correo@ejemplo.com"
            className="h-12 text-base"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Contraseña
          </Label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Introduce tu contraseña"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {loginFailure ? (
          <FormError>
            {LOGIN_FAILURE_MESSAGES[loginFailure]}
          </FormError>
        ) : googleFailed && (
          <FormError>{GOOGLE_FAILURE_MESSAGE}</FormError>
        )}

        <Button type="submit" size="lg" disabled={isLoading} className="w-full">
          {isLoading ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      <GoogleSignIn />

      <div className="flex flex-col gap-2 text-[15px]">
        <TextLink to="/forgot-password">He olvidado la contraseña</TextLink>
        <p className="text-muted-foreground">¿Primera vez? Pide acceso a tu club o a la Federación.</p>
      </div>
    </div>
  );
};
