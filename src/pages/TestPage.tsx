// src/pages/TestPage.tsx
import { useAuth } from '../contexts/AuthContext';

const TestPage = () => {
  const { userProfile } = useAuth();

  return (
    <div style={{ padding: '40px', color: 'green', fontSize: '24px', textAlign: 'center' }}>
      <h1>Test Page Loaded Successfully!</h1>
      <p>If you see this, your AuthProvider and ProtectedRoute are working.</p>
      <p>Welcome, {userProfile?.name || 'User'}!</p>
    </div>
  );
};

export default TestPage;
