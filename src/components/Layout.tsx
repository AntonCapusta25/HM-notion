import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PremiumSidebar } from './premium/PremiumSidebar';
import { PremiumHeader } from './premium/PremiumHeader';
import { useTheme } from '../contexts/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black transition-colors duration-500 overflow-x-hidden">
      {/* Conditional Sidebar */}
      {isDark ? (
        <PremiumSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      ) : (
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      )}

      {/* Main Content Area - Adjusted margin for Premium Sidebar */}
      <div className={`flex-1 flex flex-col transition-all duration-300 min-h-screen ${isDark
        ? (sidebarCollapsed ? 'md:ml-24' : 'md:ml-[280px]') // Premium Spacing
        : (sidebarCollapsed ? 'ml-16' : 'ml-64')          // Standard Spacing
        }`}>

        {/* Conditional Header */}
        {isDark ? (
          <PremiumHeader onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
        ) : (
          <Header onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
        )}

        <main className={`flex-1 p-6 ${isDark ? 'pt-4' : ''} relative`}>
          {/* Background Gradients for Premium Mode */}
          {isDark && (
            <div className="fixed inset-0 pointer-events-none -z-10">
              <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-3xl opacity-50 mix-blend-screen animate-pulse"></div>
              <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-3xl opacity-30 mix-blend-screen"></div>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};
