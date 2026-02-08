import { RegisterForm } from "@/features/auth/components/RegisterForm"
import { Link } from "react-router-dom"
import { ArrowLeft, Bot, Sparkles, TrendingUp, Zap } from "lucide-react"

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Brand/Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800" />
        
        {/* Overlay Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/20" />
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-20 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute bottom-32 right-16 w-16 h-16 bg-white/10 rounded-full blur-xl animate-pulse delay-1000" />
        <div className="absolute top-1/3 right-1/4 w-12 h-12 bg-white/10 rounded-full blur-xl animate-pulse delay-500" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 py-12 text-white">
          {/* Logo/Brand */}
          <div className="mb-8">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl group-hover:bg-white/30 transition-all duration-300">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">Up To Date AI</span>
            </Link>
          </div>

          {/* Hero Content */}
          <div className="space-y-6 max-w-lg">
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
              Join the
              <span className="block bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                Future of AI
              </span>
            </h1>
            
            <p className="text-xl text-white/90 leading-relaxed">
              Create your account to access cutting-edge AI technology. Transform your workflow 
              and boost productivity with the latest tools and insights.
            </p>

            {/* Feature highlights */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center space-x-3 text-white/90">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <Zap className="w-4 h-4" />
                </div>
                <span>Lightning-fast AI processing</span>
              </div>
              <div className="flex items-center space-x-3 text-white/90">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span>Real-time insights and analytics</span>
              </div>
              <div className="flex items-center space-x-3 text-white/90">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span>Innovative AI-powered solutions</span>
              </div>
            </div>
          </div>

          {/* Bottom decoration */}
          <div className="absolute bottom-8 left-12 right-12">
            <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <div className="text-center pt-4 text-white/60 text-sm">
              Join thousands of innovators worldwide
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="flex-1 flex flex-col min-h-screen bg-gray-50/50">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
          <Link 
            to="/" 
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors group lg:hidden"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to Home</span>
          </Link>
          
          {/* Mobile Logo */}
          <Link to="/" className="flex items-center space-x-2 lg:hidden">
            <Bot className="w-6 h-6 text-primary" />
            <span className="text-lg font-bold text-gray-900">Up To Date AI</span>
          </Link>
          
          <div className="hidden lg:block" />
        </header>

        {/* Registration Form Container */}
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md">
            {/* Mobile Hero Text */}
            <div className="text-center mb-8 lg:hidden">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h2>
              <p className="text-gray-600">Join thousands of innovators using AI</p>
            </div>
            
            <RegisterForm />
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 text-center text-sm text-gray-500 bg-white/50 backdrop-blur-sm border-t border-gray-200/50">
          <p>© 2024 Up To Date AI. All rights reserved.</p>
        </footer>
      </div>
    </div>
  )
}