import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const loadProfile = async (user) => {
    if (!supabase || !user) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, phone, role, location, created_at')
      .eq('id', user.id)
      .single();
    if (error) return null;
    return data;
  };

  useEffect(() => {
    let sub;
    const init = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      setSession(data?.session ?? null);
      if (data?.session?.user) {
        const p = await loadProfile(data.session.user);
        setProfile(p);
      }
      setLoading(false);
      const { data: authSub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          const p = await loadProfile(newSession.user);
          setProfile(p);
        } else {
          setProfile(null);
        }
      });
      sub = authSub?.subscription;
    };
    init();
    return () => sub?.unsubscribe?.();
  }, []);

  const value = useMemo(() => ({
    session,
    user: session?.user || null,
    profile,
    loading,
    isGuest,
    setIsGuest,
    isSupabaseConfigured,
  }), [session, profile, loading, isGuest]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
