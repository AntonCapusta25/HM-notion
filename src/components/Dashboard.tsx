import { useAuth } from '../contexts/AuthContext';

export const Dashboard = () => {
  const { user, userProfile, loading } = useAuth();
  
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>DEBUG INFO</h1>
      <p><strong>Auth Loading:</strong> {loading ? 'TRUE' : 'FALSE'}</p>
      <p><strong>User Exists:</strong> {user ? 'YES' : 'NO'}</p>
      <p><strong>User Profile Exists:</strong> {userProfile ? 'YES' : 'NO'}</p>
      <p><strong>User ID:</strong> {user?.id || 'NONE'}</p>
      <p><strong>User Email:</strong> {user?.email || 'NONE'}</p>
      
      {loading && <p style={{color: 'red'}}>STUCK IN LOADING STATE</p>}
      
      <h2>Environment Variables Check:</h2>
      <p><strong>VITE_SUPABASE_URL:</strong> {import.meta.env.VITE_SUPABASE_URL ? 'FOUND' : 'MISSING'}</p>
      <p><strong>VITE_SUPABASE_ANON_KEY:</strong> {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'FOUND' : 'MISSING'}</p>
    </div>
  );
};
