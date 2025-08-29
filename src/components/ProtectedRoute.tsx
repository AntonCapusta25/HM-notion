import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { User as UserProfile } from '@/types';

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

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
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
      setProfileLoading(false);
    }
  }, [user, authLoading]);

  if (authLoading || profileLoading) {
    return <LoadingScreen />;
  }

  if (!user || !profile) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// This line is crucial for the import to work correctly.
export default ProtectedRoute;
