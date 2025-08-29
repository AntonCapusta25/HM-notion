import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user, loading } = useAuth();
  const location = useLocation();

  // DEBUG: Log the authentication state
  console.log('ProtectedRoute - user:', user);
  console.log('ProtectedRoute - loading:', loading);
  console.log('ProtectedRoute - current path:', location.pathname);

  // Show loading screen while checking authentication
  if (loading) {
    console.log('ProtectedRoute - showing loading screen');
    return <LoadingScreen />;
  }

  // If no user, redirect to login
  if (!user) {
    console.log('ProtectedRoute - no user found, redirecting to signin');
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // If user exists, render the protected content
  console.log('ProtectedRoute - user authenticated, showing protected content');
  return <>{children}</>;
};

export default ProtectedRoute;
