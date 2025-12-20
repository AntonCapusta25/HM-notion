import { Layout } from '../components/Layout';
import { Dashboard } from '../components/Dashboard';
import { PremiumDashboard } from '../components/premium/PremiumDashboard';
import { useTheme } from '../contexts/ThemeContext';

const Index = () => {
  const { theme } = useTheme();

  return (
    <Layout>
      {theme === 'dark' ? <PremiumDashboard /> : <Dashboard />}
    </Layout>
  );
};

export default Index;
