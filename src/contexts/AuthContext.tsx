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
      const { data, error } = await supabase.from('users').select('*').eq('id', userId).single()
      if (error) throw error
      setUserProfile(data)
    } catch (err) {
      console.error('Error fetching user profile:', err)
      setUserProfile(null)
    }
  }, [])

  // FIX: A simpler, more robust useEffect that relies only on onAuthStateChange
  useEffect(() => {
    // onAuthStateChange fires immediately with the initial user session or null
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
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

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchUserProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password })
  }, [])

  const signUp = useCallback(async (email: string, password: string, userData: Omit<User, 'id'>) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (data.user && !error) {
      await supabase.from('users').insert([{ id: data.user.id, email, ...userData }])
    }
    return { data, error }
  }, [])

  const signOut = useCallback(async () => {
    return await supabase.auth.signOut()
  }, [])

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
