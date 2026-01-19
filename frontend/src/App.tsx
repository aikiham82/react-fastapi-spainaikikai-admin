import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import "./App.css";
import { AuthProvider } from "./features/auth/hooks/useAuthContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./core/data/queryClient";
import LoginPage from "./pages/login.page";
import RegisterPage from "./pages/register.page";
import HomePage from "./pages/home.page";
import UnauthorizedPage from "./pages/unauthorized.page";
import { AppLayout } from "./components/AppLayout";
import { ClubsPage } from "./pages/clubs.page";
import { MembersPage } from "./pages/members.page";
import { LicensesPage } from "./pages/licenses.page";
import { PaymentsPage } from "./pages/payments.page";
import { SeminarsPage } from "./pages/seminars.page";
import { InsurancePage } from "./pages/insurance.page";
import { ImportExportPage } from "./pages/import-export.page";
import { SettingsPage } from "./pages/settings.page";
import { PriceConfigurationsPage } from "./pages/price-configurations.page";
import { InvoicesPage } from "./pages/invoices.page";
import { PaymentSuccessPage } from "./pages/payment-success.page";
import { PaymentFailurePage } from "./pages/payment-failure.page";
import ForgotPasswordPage from "./pages/forgot-password.page";
import ResetPasswordPage from "./pages/reset-password.page";

import { Toaster } from "sonner";

function App() {
  return (
    <div className="overflow-hidden">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <Toaster richColors position="top-right" />
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
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/invoices" element={<InvoicesPage />} />
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
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </div>
  );
}

export default App;
