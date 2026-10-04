import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) { setProfile(null); setLoading(false); }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session) return null;
    const { data } = await supabase
      .from("profiles")
      .select("id, role, full_name, display_name, phone, exam_number, citizen_id_last4, registered_at, verification_status, verification_note, xp, level")
      .eq("id", session.user.id)
      .single();
    setProfile(data);
    setLoading(false);
    return data;
  }, [session]);

  useEffect(() => { if (session) refreshProfile(); }, [session, refreshProfile]);

  const value = {
    session, profile, loading, refreshProfile,
    isAdmin: profile?.role === "admin",
    isRegistered: !!profile?.registered_at,
    isVerified: profile?.verification_status === "verified",
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
