import React, { createContext, useContext, useEffect, useState } from 'react'
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

  const fetchUserProfile = async (userId: string) => {
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
  }

  useEffect(() => {
    // Get initial session
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

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
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
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      return { data, error }
    } catch (err) {
      return { error: err }
    }
  }

  const signUp = async (email: string, password: string, userData: Omit<User, 'id'>) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      })

      if (data.user && !error) {
        // Create user profile
        const { error: profileError } = await supabase.from('users').insert([{
          id: data.user.id,
          email: email,
          ...userData
        }])
        
        if (profileError) {
          console.error('Error creating user profile:', profileError)
        }
      }

      return { data, error }
    } catch (err) {
      return { error: err }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (err) {
      return { error: err }
    }
  }

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin: userProfile?.role === 'admin'
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
