import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

const testQuery = async () => {
  console.log('Testing direct profile query...');
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', '5dc1149d-f75c-43e0-95b5-798473f89989')
      .single();
    
    console.log('Direct query result:', { data, error });
  } catch (err) {
    console.log('Direct query failed:', err);
  }
};

// Add this button to your login page
<button onClick={testQuery}>Test Profile Query</button>
const testDirectLogin = async () => {
  try {
    console.log("Testing direct login...");
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'ali@homemade.com',    // Use your test admin email
        password: 'password123'       // Use your test password
      })
    });

    console.log('Direct login test status:', response.status);
    const data = await response.json();
    console.log('Direct login test response:', data);

  } catch (error) {
    console.error('Direct login test failed:', error);
  }
};
const testSupabaseConnection = async () => {
  try {
    // Test basic API
    const response = await fetch('https://nkvppuhwanflzowcqnjx.supabase.co/rest/v1/', {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
      }
    });
    console.log('Supabase connection test:', response.status);
    
    // Test auth endpoint specifically
    const authResponse = await fetch('https://nkvppuhwanflzowcqnjx.supabase.co/auth/v1/settings', {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
      }
    });
    console.log('Auth endpoint test:', authResponse.status);
    
  } catch (error) {
    console.error('Connection failed:', error);
  }
};

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { user, signIn } = useAuth()

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

          {/* Test connection button */}
          <Button 
            onClick={testSupabaseConnection}
            variant="outline" 
            className="w-full mt-4"
          >
            Test Supabase Connection
          </Button>

          <Button onClick={testDirectLogin} variant="destructive" className="w-full mt-2">
          Test Direct Login API
          </Button>

          <button onClick={testQuery}>Test Profile Query</button>

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
