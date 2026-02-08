import { useState } from "react";
import { useRequestPasswordResetMutation } from "../hooks/mutations/useRequestPasswordReset.mutation";
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
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export const ForgotPasswordForm = () => {
  const [email, setEmail] = useState("");
  const { requestResetAsync, isLoading, isSuccess, error, data, reset } =
    useRequestPasswordResetMutation();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await requestResetAsync({ email });
    } catch {
      // Error is handled by the mutation
    }
  };

  // Show email sending error (API returned 200 but success=false)
  if (isSuccess && data && !data.success) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-center text-gray-900">
            Error al enviar
          </CardTitle>
          <CardDescription className="text-center text-gray-600">
            {data.message}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col space-y-4 pt-6">
          <Button
            variant="outline"
            className="w-full h-12 font-medium transition-all duration-200"
            onClick={() => {
              reset();
            }}
          >
            Intentar de nuevo
          </Button>
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

  // Show success message only when email was actually sent
  if (isSuccess && data?.success) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-center text-gray-900">
            Correo enviado
          </CardTitle>
          <CardDescription className="text-center text-gray-600">
            Si existe una cuenta con ese correo, recibiras un enlace para
            restablecer tu contrasena.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500 text-center">
            Revisa tu bandeja de entrada y sigue las instrucciones del correo.
            El enlace expirara en 24 horas.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pt-6">
          <Link to="/login" className="w-full">
            <Button
              variant="outline"
              className="w-full h-12 font-medium transition-all duration-200"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al inicio de sesion
            </Button>
          </Link>
          <button
            type="button"
            onClick={() => {
              reset();
              setEmail("");
            }}
            className="text-sm text-primary hover:text-primary/80 transition-colors font-medium underline-offset-4 hover:underline"
          >
            Enviar a otro correo
          </button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-white/95 backdrop-blur-sm">
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="text-2xl font-bold text-center text-gray-900">
          Recuperar contrasena
        </CardTitle>
        <CardDescription className="text-center text-gray-600">
          Introduce tu correo electronico y te enviaremos un enlace para
          restablecer tu contrasena
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-sm font-medium text-gray-700"
            >
              Correo electronico
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="correo@ejemplo.com"
                className="pl-10 h-12 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">
                Ha ocurrido un error. Por favor, intentalo de nuevo.
              </p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className={cn(
              "w-full h-12 bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white font-medium transition-all duration-200",
              "hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Enviando...</span>
              </div>
            ) : (
              "Enviar enlace de recuperacion"
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
