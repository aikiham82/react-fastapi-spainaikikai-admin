import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useValidateTokenQuery } from "../hooks/queries/useValidateToken.query";
import { useResetPasswordMutation } from "../hooks/mutations/useResetPassword.mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const ResetPasswordForm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationError, setValidationError] = useState("");

  const {
    data: tokenData,
    isLoading: isValidating,
    isError: isTokenInvalid,
  } = useValidateTokenQuery(token);

  const {
    resetPasswordAsync,
    isLoading: isResetting,
    isSuccess,
    error,
  } = useResetPasswordMutation();

  // Redirect to login after successful reset
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        navigate("/login");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, navigate]);

  const validatePasswords = (): boolean => {
    if (newPassword.length < 8) {
      setValidationError("La contrasena debe tener al menos 8 caracteres");
      return false;
    }
    if (newPassword !== confirmPassword) {
      setValidationError("Las contrasenas no coinciden");
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

  // Loading state while validating token
  if (isValidating) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-white/95 backdrop-blur-sm">
        <CardContent className="py-16">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-gray-600">Validando enlace...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Invalid or expired token
  if (isTokenInvalid || !token) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-center text-gray-900">
            Enlace invalido
          </CardTitle>
          <CardDescription className="text-center text-gray-600">
            El enlace de restablecimiento no es valido o ha expirado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500 text-center">
            Los enlaces de restablecimiento solo son validos durante 24 horas.
            Si necesitas restablecer tu contrasena, solicita un nuevo enlace.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pt-6">
          <Link to="/forgot-password" className="w-full">
            <Button className="w-full h-12 font-medium transition-all duration-200 bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white">
              Solicitar nuevo enlace
            </Button>
          </Link>
          <Link to="/login" className="w-full">
            <Button
              variant="ghost"
              className="w-full h-10 font-medium transition-all duration-200 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al inicio de sesion
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-center text-gray-900">
            Contrasena restablecida
          </CardTitle>
          <CardDescription className="text-center text-gray-600">
            Tu contrasena ha sido actualizada correctamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500 text-center">
            Seras redirigido al inicio de sesion en unos segundos...
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pt-6">
          <Link to="/login" className="w-full">
            <Button className="w-full h-12 font-medium transition-all duration-200 bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white">
              Ir al inicio de sesion
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // Reset password form
  return (
    <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-white/95 backdrop-blur-sm">
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="text-2xl font-bold text-center text-gray-900">
          Nueva contrasena
        </CardTitle>
        <CardDescription className="text-center text-gray-600">
          {tokenData?.email && (
            <span>
              Introduce una nueva contrasena para{" "}
              <strong>{tokenData.email}</strong>
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label
              htmlFor="new-password"
              className="text-sm font-medium text-gray-700"
            >
              Nueva contrasena
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                placeholder="Minimo 8 caracteres"
                className="pl-10 pr-10 h-12 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setValidationError("");
                }}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 h-6 w-6 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-gray-100"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="confirm-password"
              className="text-sm font-medium text-gray-700"
            >
              Confirmar contrasena
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repite la contrasena"
                className="pl-10 pr-10 h-12 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setValidationError("");
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 h-6 w-6 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-gray-100"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {(validationError || error) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">
                {validationError ||
                  "Ha ocurrido un error. Por favor, intentalo de nuevo."}
              </p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isResetting}
            className={cn(
              "w-full h-12 bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white font-medium transition-all duration-200",
              "hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
              isResetting && "opacity-50 cursor-not-allowed"
            )}
          >
            {isResetting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Restableciendo...</span>
              </div>
            ) : (
              "Restablecer contrasena"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4 pt-6">
        <Link to="/login" className="w-full">
          <Button
            variant="ghost"
            className="w-full h-10 font-medium transition-all duration-200 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al inicio de sesion
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};
