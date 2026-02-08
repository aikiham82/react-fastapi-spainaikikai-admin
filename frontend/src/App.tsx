import { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import "./App.css";
import { AuthProvider } from "./features/auth/hooks/useAuthContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./core/data/queryClient";
import { AppLayout } from "./components/AppLayout";
import { Loader2 } from "lucide-react";
import { Toaster } from "sonner";

// Pages with default exports
const LoginPage = lazy(() => import("./pages/login.page"));
const RegisterPage = lazy(() => import("./pages/register.page"));
const HomePage = lazy(() => import("./pages/home.page"));
const ForgotPasswordPage = lazy(() => import("./pages/forgot-password.page"));
const ResetPasswordPage = lazy(() => import("./pages/reset-password.page"));
const UnauthorizedPage = lazy(() => import("./pages/unauthorized.page"));

// Pages with named exports
const ClubsPage = lazy(() => import("./pages/clubs.page").then(m => ({ default: m.ClubsPage })));
const MembersPage = lazy(() => import("./pages/members.page").then(m => ({ default: m.MembersPage })));
const LicensesPage = lazy(() => import("./pages/licenses.page").then(m => ({ default: m.LicensesPage })));
const SeminarsPage = lazy(() => import("./pages/seminars.page").then(m => ({ default: m.SeminarsPage })));
const InsurancePage = lazy(() => import("./pages/insurance.page").then(m => ({ default: m.InsurancePage })));
const ImportExportPage = lazy(() => import("./pages/import-export.page").then(m => ({ default: m.ImportExportPage })));
const SettingsPage = lazy(() => import("./pages/settings.page").then(m => ({ default: m.SettingsPage })));
const PriceConfigurationsPage = lazy(() => import("./pages/price-configurations.page").then(m => ({ default: m.PriceConfigurationsPage })));
const InvoicesPage = lazy(() => import("./pages/invoices.page").then(m => ({ default: m.InvoicesPage })));
const PaymentSuccessPage = lazy(() => import("./pages/payment-success.page").then(m => ({ default: m.PaymentSuccessPage })));
const PaymentFailurePage = lazy(() => import("./pages/payment-failure.page").then(m => ({ default: m.PaymentFailurePage })));
const AnnualPaymentsPage = lazy(() => import("./pages/annual-payments.page").then(m => ({ default: m.AnnualPaymentsPage })));
const ClubPaymentsPageRoute = lazy(() => import("./pages/club-payments.page").then(m => ({ default: m.ClubPaymentsPageRoute })));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

function App() {
  return (
    <div className="overflow-hidden">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <Toaster richColors position="top-right" />
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                <Route element={<AppLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/clubs" element={<ClubsPage />} />
                  <Route path="/members" element={<MembersPage />} />
                  <Route path="/licenses" element={<LicensesPage />} />
                  <Route path="/invoices" element={<InvoicesPage />} />
                  <Route path="/annual-payments" element={<AnnualPaymentsPage />} />
                  <Route path="/club-payments" element={<ClubPaymentsPageRoute />} />
                  <Route path="/seminars" element={<SeminarsPage />} />
                  <Route path="/insurance" element={<InsurancePage />} />
                  <Route path="/import-export" element={<ImportExportPage />} />
                  <Route path="/price-configurations" element={<PriceConfigurationsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>

                {/* Payment result pages - outside AppLayout for cleaner UX */}
                <Route path="/payment/success" element={<PaymentSuccessPage />} />
                <Route path="/payment/failure" element={<PaymentFailurePage />} />

                <Route
                  path="/unauthorized"
                  element={<UnauthorizedPage />}
                />
              </Routes>
            </Suspense>
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </div>
  );
}

export default App;
