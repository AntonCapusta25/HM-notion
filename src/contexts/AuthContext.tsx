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
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // FIX: Wrapped in useCallback for stable reference
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (data && !error) {
        setUserProfile(data)
      } else if (error) {
        console.error('Error fetching user profile:', error)
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err)
    }
  }, [])

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          await fetchUserProfile(session.user.id)
        }
      } catch (err) {
        console.error('Error getting initial session:', err)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (session?.user) {
          setUser(session.user)
          await fetchUserProfile(session.user.id)
        } else {
          setUser(null)
          setUserProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchUserProfile]) // FIX: Added fetchUserProfile to dependency array

  // FIX: Wrapped in useCallback for stable reference
  const signIn = useCallback(async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password })
  }, [])

  // FIX: Wrapped in useCallback for stable reference
  const signUp = useCallback(async (email: string, password: string, userData: Omit<User, 'id'>) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (data.user && !error) {
      await supabase.from('users').insert([{ id: data.user.id, email, ...userData }])
    }
    return { data, error }
  }, [])

  // FIX: Wrapped in useCallback for stable reference
  const signOut = useCallback(async () => {
    return await supabase.auth.signOut()
  }, [])

  // FIX: Wrapped context value in useMemo to prevent re-renders
  const value = useMemo(() => ({
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin: userProfile?.role === 'admin'
  }), [user, userProfile, loading, signIn, signUp, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
