import { useEffect, useState } from "react";
import { useAuthContext } from "../hooks/useAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Lock, Eye, EyeOff, User, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, Link } from "react-router-dom";
import { useRegisterMutation } from "../hooks/mutations/useRegister.mutation";
import { toast } from "sonner";
import { appStorage } from "@/core/data/appStorage";
import { jwtDecode } from "jwt-decode";


export const RegisterForm = () => {
  const { isAuthenticated } = useAuthContext();
  const navigate = useNavigate();
  const { registerMutation, isPending } = useRegisterMutation();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
  }>({});
  const [serverError, setServerError] = useState<string>("");
  const [touched, setTouched] = useState<{
    username?: boolean;
    email?: boolean;
    password?: boolean;
  }>({});

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
      return;
    }
  }, [isAuthenticated, navigate]);

  // Real-time validation
  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors };

    switch (field) {
      case 'username':
        if (!value.trim()) {
          newErrors.username = "Username is required";
        } else if (value.length < 3) {
          newErrors.username = "Username must be at least 3 characters";
        } else if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
          newErrors.username = "Username can only contain letters, numbers, hyphens, and underscores";
        } else {
          delete newErrors.username;
        }
        break;
      case 'email':
        if (!value.trim()) {
          newErrors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(value)) {
          newErrors.email = "Please enter a valid email address";
        } else {
          delete newErrors.email;
        }
        break;
      case 'password':
        if (!value) {
          newErrors.password = "Password is required";
        } else if (value.length < 6) {
          newErrors.password = "Password must be at least 6 characters";
        } else {
          delete newErrors.password;
        }
        break;
    }

    setErrors(newErrors);
    return newErrors;
  };

  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
    const value = field === 'username' ? username : field === 'email' ? email : password;
    validateField(field, value);
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!username.trim()) {
      newErrors.username = "Username is required";
    } else if (username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      newErrors.username = "Username can only contain letters, numbers, hyphens, and underscores";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    setTouched({ username: true, email: true, password: true });
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    if (!validateForm()) {
      return;
    }

    const data = {
      username: username.trim(),
      email: email.trim(),
      password
    };

    registerMutation(data, {
      onSuccess: async (response) => {
        toast.success("Registration successful! Logging you in...");
        // Store the token and auth data
        const decoded = jwtDecode(response.access_token) as { exp?: number; sub?: string };
        const { exp, sub } = decoded;

        if (exp) {
          const expirationDate = new Date(exp * 1000);
          localStorage.setItem('session_expiration', expirationDate.toISOString());
        }
        localStorage.setItem('user_email', sub || '');
        appStorage().local.setString('access_token', response.access_token);

        // Reload to trigger auth context update
        window.location.href = "/";
      },
      onError: (err: any) => {
        const errorMessage = err?.response?.data?.detail || err?.message || "Registration failed. Please try again.";

        // Check for specific error types
        if (errorMessage.includes("already exists") || errorMessage.includes("duplicate")) {
          if (errorMessage.toLowerCase().includes("email")) {
            setErrors({ ...errors, email: "This email is already registered" });
          } else if (errorMessage.toLowerCase().includes("username")) {
            setErrors({ ...errors, username: "This username is already taken" });
          } else {
            setServerError("An account with these details already exists");
          }
        } else {
          setServerError(errorMessage);
        }

        toast.error(errorMessage);
      }
    });
  };


  return (
    <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-white/95 backdrop-blur-sm">
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="text-2xl font-bold text-center text-gray-900">
          Create an account
        </CardTitle>
        <CardDescription className="text-center text-gray-600">
          Enter your details to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Global server error alert */}
        {serverError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label
              htmlFor="username"
              className={cn(
                "text-sm font-medium",
                touched.username && errors.username ? "text-destructive" : "text-gray-700"
              )}
            >
              Username
            </Label>
            <div className="relative">
              <User className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
                touched.username && errors.username ? "text-destructive" : "text-gray-400"
              )} />
              <Input
                id="username"
                type="text"
                placeholder="johndoe"
                className={cn(
                  "pl-10 h-12 transition-all duration-200",
                  touched.username && errors.username
                    ? "border-destructive focus:ring-destructive/20 focus:border-destructive"
                    : "focus:ring-2 focus:ring-primary/20 focus:border-primary"
                )}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (touched.username) {
                    validateField('username', e.target.value);
                  }
                }}
                onBlur={() => handleBlur('username')}
                aria-invalid={touched.username && !!errors.username}
                aria-describedby={errors.username ? "username-error" : undefined}
              />
            </div>
            {touched.username && errors.username && (
              <div id="username-error" className="flex items-center space-x-1 text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.username}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="email"
              className={cn(
                "text-sm font-medium",
                touched.email && errors.email ? "text-destructive" : "text-gray-700"
              )}
            >
              Email
            </Label>
            <div className="relative">
              <Mail className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
                touched.email && errors.email ? "text-destructive" : "text-gray-400"
              )} />
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                className={cn(
                  "pl-10 h-12 transition-all duration-200",
                  touched.email && errors.email
                    ? "border-destructive focus:ring-destructive/20 focus:border-destructive"
                    : "focus:ring-2 focus:ring-primary/20 focus:border-primary"
                )}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (touched.email) {
                    validateField('email', e.target.value);
                  }
                }}
                onBlur={() => handleBlur('email')}
                aria-invalid={touched.email && !!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
            </div>
            {touched.email && errors.email && (
              <div id="email-error" className="flex items-center space-x-1 text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.email}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="password"
              className={cn(
                "text-sm font-medium",
                touched.password && errors.password ? "text-destructive" : "text-gray-700"
              )}
            >
              Password
            </Label>
            <div className="relative">
              <Lock className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
                touched.password && errors.password ? "text-destructive" : "text-gray-400"
              )} />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                className={cn(
                  "pl-10 pr-10 h-12 transition-all duration-200",
                  touched.password && errors.password
                    ? "border-destructive focus:ring-destructive/20 focus:border-destructive"
                    : "focus:ring-2 focus:ring-primary/20 focus:border-primary"
                )}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (touched.password) {
                    validateField('password', e.target.value);
                  }
                }}
                onBlur={() => handleBlur('password')}
                aria-invalid={touched.password && !!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 h-6 w-6 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-gray-100"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {touched.password && errors.password ? (
              <div id="password-error" className="flex items-center space-x-1 text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.password}</span>
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                Password must be at least 6 characters long
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className={cn(
              "w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium transition-all duration-200",
              "hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
              isPending && "opacity-50 cursor-not-allowed"
            )}
          >
            {isPending ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Creating account...</span>
              </div>
            ) : (
              "Sign Up"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4 pt-6">
        <div className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-primary/20 rounded px-1"
          >
            Sign in
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
};