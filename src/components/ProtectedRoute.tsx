import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";

// A dedicated loading screen component
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// A dedicated error screen component for profile fetch failures
const ErrorScreen = () => {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 max-w-md mx-auto">
        <h1 className="text-xl font-semibold text-destructive mb-4">Unable to Load User Profile</h1>
        <p className="text-muted-foreground mb-6">
          There was an issue fetching your profile data. This might be a temporary problem. Please try signing out and signing back in.
        </p>
        <Button onClick={() => signOut()}>Sign Out</Button>
      </div>
    </div>
  );
};


interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, userProfile, loading, profileError } = useAuth();
  const location = useLocation();

  // 1. Show a loading screen while the initial authentication check is running.
  if (loading) {
    return <LoadingScreen />;
  }

  // 2. If the initial load is done and there's no user, redirect to the login page.
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. (THE FIX) If an error occurred while fetching the profile, show a dedicated error page.
  if (profileError) {
    return <ErrorScreen />;
  }

  // 4. If there's a user but we're still waiting for their profile, continue to show the loading screen.
  // This handles the brief moment between authentication and profile data arriving.
  if (!userProfile) {
    return <LoadingScreen />;
  }

  // 5. If all checks pass, show the protected page content.
  return <>{children}</>;
};

export default ProtectedRoute;
