import { Navigate, Route } from 'react-router-dom';

export const legacyPaymentRoutes = (
  <>
    <Route path="/annual-payments" element={<Navigate to="/payments" replace />} />
    <Route path="/club-payments" element={<Navigate to="/payments?tab=historial" replace />} />
  </>
);
