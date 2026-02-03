import { AuthProvider } from './contexts/AuthContext'
import { TaskProvider } from './contexts/TaskContext'
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/index";
import MyTasks from "./pages/MyTasks";
import Team from "./pages/Team";
import Calendar from "./pages/Calendar";
import { PremiumCalendar } from "./components/premium/PremiumCalendar";
import Search from "./pages/Search";
import Settings from "./pages/Settings";
import { PremiumSettings } from "./components/premium/PremiumSettings";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import TestPage from './pages/TestPage';
import WorkspaceDetail from "./pages/WorkspaceDetail";
import Education from "./pages/Education";
import { ThemeRoute } from "./components/ThemeRoute";
import LaunchPosts from "./pages/LaunchPosts";

// CRITICAL FIX: Move QueryClient creation outside component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TaskProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />

              {/* Protected routes - require authentication */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="/my-tasks" element={
                <ProtectedRoute>
                  <MyTasks />
                </ProtectedRoute>
              } />
              <Route path="/team" element={
                <ProtectedRoute>
                  <Team />
                </ProtectedRoute>
              } />
              <Route path="/calendar" element={
                <ProtectedRoute>
                  <ThemeRoute
                    standard={<Calendar />}
                    premium={<PremiumCalendar />}
                  />
                </ProtectedRoute>
              } />
              <Route path="/launch-posts" element={
                <ProtectedRoute>
                  <LaunchPosts />
                </ProtectedRoute>
              } />
              <Route path="/search" element={
                <ProtectedRoute>
                  <Search />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <ThemeRoute
                    standard={<Settings />}
                    premium={<PremiumSettings />}
                  />
                </ProtectedRoute>
              } />
              <Route path="/workspace/:id" element={
                <ProtectedRoute>
                  <WorkspaceDetail />
                </ProtectedRoute>
              } />

              {/* Education routes */}
              <Route path="/education/:topic/:subtopic" element={
                <ProtectedRoute>
                  <Education />
                </ProtectedRoute>
              } />
              <Route path="/education/:topic" element={
                <ProtectedRoute>
                  <Education />
                </ProtectedRoute>
              } />

              {/* Test route - can be removed in production */}
              <Route path="/test" element={
                <ProtectedRoute>
                  <TestPage />
                </ProtectedRoute>
              } />

              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </TaskProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
