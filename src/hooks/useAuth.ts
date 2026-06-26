import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/lib/supabase";
import { LOGIN_PATH } from "@/const";
import type { Session } from "@supabase/supabase-js";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export type AppUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
};

function toUser(session: Session | null): AppUser | null {
  const u = session?.user;
  if (!u) return null;
  const meta = u.user_metadata ?? {};
  return {
    id: u.id,
    name: (meta.name as string) ?? u.email?.split("@")[0] ?? null,
    email: u.email ?? null,
    role: (meta.role as string) ?? "user",
  };
}

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = LOGIN_PATH } =
    options ?? {};
  const navigate = useNavigate();

  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(toUser(data.session));
      setIsLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toUser(session));
      setIsLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (redirectOnUnauthenticated && !isLoading && !user) {
      if (window.location.pathname !== redirectPath) {
        navigate(redirectPath);
      }
    }
  }, [redirectOnUnauthenticated, isLoading, user, navigate, redirectPath]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    navigate(redirectPath);
  }, [navigate, redirectPath]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setUser(toUser(data.session));
  }, []);

  return useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      error: null,
      logout,
      refresh,
    }),
    [user, isLoading, logout, refresh],
  );
}
