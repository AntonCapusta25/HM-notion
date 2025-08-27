useEffect(() => {
  const getInitialSession = async () => {
    try {
      // Add timeout to prevent hanging forever
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth timeout')), 10000)
      );
      
      const sessionPromise = supabase.auth.getSession();
      
      const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
      
      if (session?.user) {
        setUser(session.user)
        await fetchUserProfile(session.user.id)
      }
    } catch (err) {
      console.error('Error getting initial session:', err)
      // Force loading to false even on error
    } finally {
      setLoading(false)
    }
  }

  getInitialSession()

  // Listen for auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
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
}, [fetchUserProfile])
