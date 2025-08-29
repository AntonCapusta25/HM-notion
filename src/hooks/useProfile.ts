import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { User as Profile } from '../types'; // Assuming your profile type is named User

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const fetchUserProfile = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase.from('users').select('*').eq('id', user.id).single();
          if (error) throw error;
          setProfile(data);
        } catch (err: any) {
          setError(err.message);
          console.error("Error fetching profile:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchUserProfile();
    } else {
      // If there is no user, there is no profile to load.
      setProfile(null);
      setLoading(false);
    }
  }, [user]);

  return { profile, loading, error };
};
