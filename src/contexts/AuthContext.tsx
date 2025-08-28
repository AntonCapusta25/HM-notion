import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { User } from '../types'

interface AuthContextType {
  user: SupabaseUser | null
  userProfile: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ data?: any; error?: any }>
  signUp: (email: string, password: string, userData: Omit<User, 'id'>) => Promise<{ data?: any; error?: any }>
  signOut: () => Promise<{ error?: any }>
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      console.log('AUTH: Starting profile fetch for user:', userId)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('AUTH: Profile fetch database error:', error)
        throw error
      }
      
      console.log('AUTH: Profile fetch success, got profile:', data)
      setUserProfile(data)
    } catch (err) {
      console.error('AUTH: Profile fetch failed:', err)
      setUserProfile(null)
    }
  }, [])

  useEffect(() => {
    console.log('AUTH: Starting AuthContext setup')
    
    // Check for existing session when the app first loads
    const getInitialSession = async () => {
      try {
        console.log('AUTH: Checking for existing session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('AUTH: Session check error:', error)
          return
        }
        
        console.log('AUTH: Session check result:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id
        })
        
        if (session?.user) {
          console.log('AUTH: User found in session, setting user and fetching profile...')
          setUser(session.user)
          
          console.log('AUTH: About to fetch profile for user:', session.user.id)
          await fetchUserProfile(session.user.id)
          console.log('AUTH: Initial profile fetch completed')
        } else {
          console.log('AUTH: No session found on initial load')
        }
      } catch (err) {
        console.error('AUTH: Error in getInitialSession:', err)
      } finally {
        console.log('AUTH: Setting initial loading to false')
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth state changes (login, logout, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AUTH: Auth state changed:', event, {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id
        })
        
        if (session?.user) {
          console.log('AUTH: Setting user from auth change and fetching profile...')
          setUser(session.user)
          await fetchUserProfile(session.user.id)
          console.log('AUTH: Auth change profile fetch completed')
        } else {
          console.log('AUTH: No user in session, clearing user and profile')
          setUser(null)
          setUserProfile(null)
        }
        console.log('AUTH: Setting loading to false after auth change')
        setLoading(false)
      }
    )

    return () => {
      console.log('AUTH: Cleaning up auth subscription')
      subscription.unsubscribe()
    }
  }, [fetchUserProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    console.log('AUTH: SignIn attempt for email:', email)
    const result = await supabase.auth.signInWithPassword({ email, password })
    console.log('AUTH: SignIn result:', { hasData: !!result.data, hasError: !!result.error })
    return result
  }, [])

  const signUp = useCallback(async (email: string, password: string, userData: Omit<User, 'id'>) => {
    console.log('AUTH: SignUp attempt for email:', email)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (data.user && !error) {
      console.log('AUTH: Creating user profile after signup')
      await supabase.from('users').insert([{ id: data.user.id, email, ...userData }])
    }
    return { data, error }
  }, [])

  const signOut = useCallback(async () => {
    console.log('AUTH: SignOut attempt')
    return await supabase.auth.signOut()
  }, [])

  const value = useMemo(() => {
    console.log('AUTH: Creating context value with state:', {
      hasUser: !!user,
      hasUserProfile: !!userProfile,
      loading,
      isAdmin: userProfile?.role === 'admin'
    })
    
    return {
      user,
      userProfile,
      loading,
      signIn,
      signUp,
      signOut,
      isAdmin: userProfile?.role === 'admin'
    }
  }, [user, userProfile, loading, signIn, signUp, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
