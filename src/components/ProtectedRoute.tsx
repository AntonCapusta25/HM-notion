import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

// A simple, self-contained loading screen component
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </div>
  </div>
);

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, userProfile, loading } = useAuth();
  const location = useLocation();

  // 1. While the AuthProvider is checking the initial auth state, show a loading screen.
  if (loading) {
    return <LoadingScreen />;
  }

  // 2. If the initial load is finished and there is no authenticated user, redirect to the login page.
  if (!user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // 3. (THE FIX) If there IS a user but we're still waiting for their profile from the database,
  // continue to show the loading screen. This prevents the redirect loop.
  if (!userProfile) {
    return <LoadingScreen />;
  }

  // 4. If all checks pass (loading is done, user is authenticated, and profile is loaded),
  // show the protected page content.
  return <>{children}</>;
};

export default ProtectedRoute;
