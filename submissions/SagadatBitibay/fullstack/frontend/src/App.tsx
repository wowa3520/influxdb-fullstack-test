import React from 'react';
import { TelemetryDashboard } from './components/Dashboard/TelemetryDashboard';
import { AuthPage } from './components/Auth/AuthPage';
import { useAuth } from './hooks/useAuth';

function App() {
  const { isAuthenticated, isLoading, user, logout, refreshAuth } = useAuth();

  const handleAuthSuccess = () => {
    refreshAuth();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="App">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Telemetry</h1>
              {user && (
                <p className="text-sm text-gray-600">{user.email}</p>
              )}
            </div>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      <TelemetryDashboard />
    </div>
  );
}

export default App;
