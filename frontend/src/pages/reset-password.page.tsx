import { ResetPasswordForm } from "@/features/password-reset";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Brand/Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black" />

        {/* Overlay Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/10" />

        {/* Floating Elements */}
        <div className="absolute top-20 left-20 w-20 h-20 bg-white/5 rounded-full blur-xl animate-pulse" />
        <div className="absolute bottom-32 right-16 w-16 h-16 bg-white/5 rounded-full blur-xl animate-pulse delay-1000" />
        <div className="absolute top-1/3 right-1/4 w-12 h-12 bg-white/5 rounded-full blur-xl animate-pulse delay-500" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 py-12 text-white">
          {/* Logo/Brand */}
          <div className="mb-8">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl group-hover:bg-white/20 transition-all duration-300">
                <img
                  src="/logo.jpg"
                  alt="Spain Aikikai"
                  className="w-10 h-10 rounded-lg object-cover"
                />
              </div>
              <span className="text-2xl font-bold text-white">
                Spain Aikikai
              </span>
            </Link>
          </div>

          {/* Hero Content */}
          <div className="space-y-6 max-w-lg">
            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl w-fit">
              <ShieldCheck className="w-12 h-12 text-white" />
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
              Nueva
              <span className="block bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                Contrasena
              </span>
            </h1>

            <p className="text-xl text-white/90 leading-relaxed">
              Crea una contrasena segura para proteger tu cuenta. Recuerda usar
              una combinacion de letras, numeros y simbolos.
            </p>

            {/* Security tips */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 space-y-3">
              <h3 className="font-semibold text-lg">
                Consejos de seguridad:
              </h3>
              <ul className="space-y-2 text-white/90 list-disc list-inside">
                <li>Usa al menos 8 caracteres</li>
                <li>Combina mayusculas y minusculas</li>
                <li>Incluye numeros y simbolos</li>
                <li>No uses datos personales obvios</li>
              </ul>
            </div>
          </div>

          {/* Bottom decoration */}
          <div className="absolute bottom-8 left-12 right-12">
            <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <div className="text-center pt-4 text-white/60 text-sm">
              Plataforma oficial de gestion de Spain Aikikai
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col min-h-screen bg-gray-50/50">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
          {/* Mobile Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img
              src="/logo.jpg"
              alt="Spain Aikikai"
              className="w-6 h-6 rounded object-cover"
            />
            <span className="text-lg font-bold text-gray-900">
              Spain Aikikai
            </span>
          </Link>

          <div className="hidden lg:block" />
        </header>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md">
            {/* Mobile Hero Text */}
            <div className="text-center mb-8 lg:hidden">
              <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="w-8 h-8 text-slate-700" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Nueva contrasena
              </h2>
              <p className="text-gray-600">
                Introduce tu nueva contrasena segura
              </p>
            </div>

            <ResetPasswordForm />
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 text-center text-sm text-gray-500 bg-white/50 backdrop-blur-sm border-t border-gray-200/50">
          <p>© 2024 Spain Aikikai. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
}
