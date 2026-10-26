import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthContext } from "../hooks/useAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

export const LoginForm = () => {
  const { login, isAuthenticated, isLoading, loginFailed } = useAuthContext();
  const navigate = useNavigate();
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

        {loginFailed && (
          <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
            El correo o la contraseña no son correctos.
          </p>
        )}

        <Button type="submit" size="lg" disabled={isLoading} className="w-full">
          {isLoading ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      <div className="flex flex-col gap-2 text-[15px]">
        <Link
          to="/forgot-password"
          className="flex min-h-11 w-fit items-center text-foreground underline underline-offset-4 hover:text-primary"
        >
          He olvidado la contraseña
        </Link>
        <p className="text-muted-foreground">¿Primera vez? Pide acceso a tu club o a la Federación.</p>
      </div>
    </div>
  );
};
