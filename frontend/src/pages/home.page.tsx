import { ProtectedRoute } from '@/core/components/ProtectedRoute';
import { Dashboard } from '@/features/dashboard/components/Dashboard';

const HomePage = () => {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
        <div className="container mx-auto px-4 py-8">
          <Dashboard />
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default HomePage;