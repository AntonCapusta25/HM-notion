import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
// Add this inside your Login component, after the other state variables
const [connectionTest, setConnectionTest] = useState('');

const testConnection = async () => {
  setConnectionTest('Testing...');
  
  try {
    // Test 1: Basic API endpoint
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      }
    });
    
    if (response.ok) {
      setConnectionTest('API connection works');
      
      // Test 2: Auth endpoint
      const authResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        }
      });
      
      if (authResponse.ok) {
        setConnectionTest('Both API and Auth work');
      } else {
        setConnectionTest(`Auth failed: ${authResponse.status}`);
      }
    } else {
      setConnectionTest(`API failed: ${response.status} - ${response.statusText}`);
    }
  } catch (error) {
    setConnectionTest(`Connection failed: ${error.message}`);
  }
};

// Add this button in your JSX, after the login form:
<Button onClick={testConnection} variant="outline" className="w-full mt-4">
  Test Connection: {connectionTest || 'Click to test'}
</Button>
const testSupabaseConnection = async () => {
  try {
    const response = await fetch('https://nkvppuhwanflzowcqnjx.supabase.co/rest/v1/', {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
      }
    });
    console.log('Supabase connection test:', response.status);
  } catch (error) {
    console.error('Supabase connection failed:', error);
  }
};

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { user, signIn } = useAuth()

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: signInError } = await signIn(email, password)
    
    if (signInError) {
      setError(signInError.message)
    }
    // If successful, AuthContext will handle redirect via ProtectedRoute
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to Homebase</CardTitle>
          <CardDescription>
            Sign in to access your task management platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4" variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Development helper */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Test Accounts:</p>
            <div className="text-xs space-y-1">
              <div>Admin: ali@homemade.com / password123</div>
              <div>Member: menna@homemade.com / password123</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Login
