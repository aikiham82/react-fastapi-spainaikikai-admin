import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
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
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ClubsPage } from "./pages/clubs.page";
import { MembersPage } from "./pages/members.page";
import { LicensesPage } from "./pages/licenses.page";
import { PaymentsPage } from "./pages/payments.page";
import { SeminarsPage } from "./pages/seminars.page";
import { InsurancePage } from "./pages/insurance.page";
import { ImportExportPage } from "./pages/import-export.page";
import type { UserRole } from "./features/auth/data/auth.schema";

function App() {
  return (
    <div className="overflow-hidden">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route element={<AppLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/clubs" element={<ClubsPage />} />
                <Route path="/members" element={<MembersPage />} />
                <Route path="/licenses" element={<LicensesPage />} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/seminars" element={<SeminarsPage />} />
                <Route path="/insurance" element={<InsurancePage />} />
                <Route path="/import-export" element={<ImportExportPage />} />
                <Route path="/settings" element={<div>Settings Page</div>} />
              </Route>

              <Route
                path="/unauthorized"
                element={<UnauthorizedPage />}
              />

              <Route path="/" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </div>
  );
}

export default App;
