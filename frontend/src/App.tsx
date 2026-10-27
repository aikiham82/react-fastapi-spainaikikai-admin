import { Suspense } from "react";
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
import { legacyPaymentRoutes } from "./pages/legacy-payment-routes";
import { Loader2 } from "lucide-react";
import { Toaster } from "sonner";
import { useNewVersionNotice } from "./core/hooks/useNewVersionNotice";
import { lazyWithRetry } from "./core/utils/lazyWithRetry";

// Pages with default exports
const LoginPage = lazyWithRetry(() => import("./pages/login.page"));
const RegisterPage = lazyWithRetry(() => import("./pages/register.page"));
const HomePage = lazyWithRetry(() => import("./pages/home.page"));
const ForgotPasswordPage = lazyWithRetry(() => import("./pages/forgot-password.page"));
const ResetPasswordPage = lazyWithRetry(() => import("./pages/reset-password.page"));
const UnauthorizedPage = lazyWithRetry(() => import("./pages/unauthorized.page"));

// Pages with named exports
const ClubsPage = lazyWithRetry(() => import("./pages/clubs.page").then(m => ({ default: m.ClubsPage })));
const MembersPage = lazyWithRetry(() => import("./pages/members.page").then(m => ({ default: m.MembersPage })));
const LicensesPage = lazyWithRetry(() => import("./pages/licenses.page").then(m => ({ default: m.LicensesPage })));
const SeminarsPage = lazyWithRetry(() => import("./pages/seminars.page").then(m => ({ default: m.SeminarsPage })));
const InsurancePage = lazyWithRetry(() => import("./pages/insurance.page").then(m => ({ default: m.InsurancePage })));
const ImportExportPage = lazyWithRetry(() => import("./pages/import-export.page").then(m => ({ default: m.ImportExportPage })));
const SettingsPage = lazyWithRetry(() => import("./pages/settings.page").then(m => ({ default: m.SettingsPage })));
const PriceConfigurationsPage = lazyWithRetry(() => import("./pages/price-configurations.page").then(m => ({ default: m.PriceConfigurationsPage })));
const InvoicesPage = lazyWithRetry(() => import("./pages/invoices.page").then(m => ({ default: m.InvoicesPage })));
const PaymentSuccessPage = lazyWithRetry(() => import("./pages/payment-success.page").then(m => ({ default: m.PaymentSuccessPage })));
const PaymentFailurePage = lazyWithRetry(() => import("./pages/payment-failure.page").then(m => ({ default: m.PaymentFailurePage })));
const PaymentsPage = lazyWithRetry(() => import("./pages/payments.page").then(m => ({ default: m.PaymentsPage })));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

function App() {
  useNewVersionNotice();

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
                  <Route path="/payments" element={<PaymentsPage />} />
                  {legacyPaymentRoutes}
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
