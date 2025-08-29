import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { User as UserProfile } from '@/types'; // Make sure your profile type is imported

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
    </div>
  </div>
);

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    if (user) {
      const fetchUserProfile = async () => {
        setProfileLoading(true);
        try {
          const { data, error } = await supabase.from('users').select('*').eq('id', user.id).single();
          if (error) throw error;
          setProfile(data);
        } catch (err) {
          console.error("Profile fetch failed:", err);
          setProfile(null);
        } finally {
          setProfileLoading(false);
        }
      };
      fetchUserProfile();
    } else if (!authLoading) {
      // If there's no user and auth is not loading, we don't need to load a profile.
      setProfileLoading(false);
    }
  }, [user, authLoading]);

  // Show a loading screen while either auth or profile is loading.
  if (authLoading || profileLoading) {
    return <LoadingScreen />;
  }

  // If loading is done and there is no user or no profile, redirect to login.
  if (!user || !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If all checks pass, render the protected page.
  return <>{children}</>;
};

export default ProtectedRoute;
