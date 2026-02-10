import { LoginForm } from "@/features/auth/components/LoginForm"
import { Shield, Users, Calendar, Award } from "lucide-react"

export default function LoginPage() {
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
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <img src="/logo.jpg" alt="Spain Aikikai" className="w-10 h-10 rounded-lg object-cover" />
              </div>
              <span className="text-2xl font-bold text-white">Spain Aikikai</span>
            </div>
          </div>

          {/* Hero Content */}
          <div className="space-y-6 max-w-lg">
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
              Panel de
              <span className="block bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                Administración
              </span>
            </h1>

            <p className="text-xl text-white/90 leading-relaxed">
              Administra clubs, miembros, licencias, seminarios y pagos de manera eficiente
              con nuestra plataforma integral de gestión.
            </p>

            {/* Feature highlights */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center space-x-3 text-white/90">
                <div className="p-2 bg-white/10 backdrop-blur-sm rounded-lg">
                  <Users className="w-4 h-4" />
                </div>
                <span>Gestión completa de miembros y clubs</span>
              </div>
              <div className="flex items-center space-x-3 text-white/90">
                <div className="p-2 bg-white/10 backdrop-blur-sm rounded-lg">
                  <Award className="w-4 h-4" />
                </div>
                <span>Control de licencias y graduaciones</span>
              </div>
              <div className="flex items-center space-x-3 text-white/90">
                <div className="p-2 bg-white/10 backdrop-blur-sm rounded-lg">
                  <Calendar className="w-4 h-4" />
                </div>
                <span>Organización de seminarios y eventos</span>
              </div>
              <div className="flex items-center space-x-3 text-white/90">
                <div className="p-2 bg-white/10 backdrop-blur-sm rounded-lg">
                  <Shield className="w-4 h-4" />
                </div>
                <span>Seguimiento de seguros y pagos</span>
              </div>
            </div>
          </div>

          {/* Bottom decoration */}
          <div className="absolute bottom-8 left-12 right-12">
            <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <div className="text-center pt-4 text-white/60 text-sm">
              Plataforma oficial de gestión de Spain Aikikai
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col min-h-screen bg-gray-50/50">
        {/* Mobile Brand Section */}
        <header className="flex flex-col items-center pt-10 pb-8 lg:hidden">
          <div className="flex flex-col items-center space-y-3">
            <img
              src="/logo.jpg"
              alt="Spain Aikikai"
              className="w-12 h-12 rounded-lg object-cover shadow-md"
            />
            <span className="text-2xl font-bold text-gray-900">Spain Aikikai</span>
            <p className="text-sm text-gray-600">Panel de Administración</p>
          </div>
        </header>

        {/* Login Form Container */}
        <div className="flex-1 flex items-center justify-center px-6 py-0 sm:px-8 sm:py-8">
          <div className="w-full max-w-md">
            <LoginForm />
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 text-center text-sm text-gray-500 bg-white/50 backdrop-blur-sm border-t border-gray-200/50">
          <p>© 2024 Spain Aikikai. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  )
}
