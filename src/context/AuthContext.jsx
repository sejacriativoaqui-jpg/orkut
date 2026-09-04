import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import * as api from "../api";
import { calcAge, validEmail, validUsername } from "../helpers";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    const [p, s] = await Promise.all([api.getProfileById(userId), api.getSettings(userId)]);
    setProfile(p);
    setSettings(s);
    return p;
  }, []);

  useEffect(() => {
  let mounted = true;

  async function initAuth() {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Erro ao carregar sessão:", error);
        return;
      }

      if (!mounted) return;

      setSession(data.session);

      if (data.session?.user) {
        try {
          await loadProfile(data.session.user.id);
        } catch (error) {
          console.error("Erro ao carregar perfil:", error);
        }
      }
    } catch (error) {
      console.error("Erro ao iniciar autenticação:", error);
    } finally {
      if (mounted) setLoading(false);
    }
  }

  initAuth();

  const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
    if (!mounted) return;

    setSession(newSession);

    if (newSession?.user) {
      setTimeout(() => {
        loadProfile(newSession.user.id).catch((error) => {
          console.error("Erro ao carregar perfil:", error);
        });
      }, 0);
    } else {
      setProfile(null);
      setSettings(null);
    }
  });

  return () => {
    mounted = false;
    sub.subscription.unsubscribe();
  };
}, [loadProfile]);

  async function signUp({ name, username, email, password, birthdate, avatarFile }) {
    const errors = {};
    if (!name.trim()) errors.name = "Informe seu nome.";
    if (!validUsername(username)) errors.username = "3–20 caracteres, minúsculas, números ou _.";
    if (!validEmail(email)) errors.email = "E-mail inválido.";
    if (!password || password.length < 6) errors.password = "Mínimo de 6 caracteres.";
    if (!birthdate) errors.birthdate = "Informe sua data de nascimento.";
    else if (calcAge(birthdate) < 18) errors.birthdate = "Você precisa ter 18 anos ou mais para se cadastrar.";
    if (Object.keys(errors).length) return { errors };

    if (!errors.username) {
      try {
        const available = await api.isUsernameAvailable(username);
        if (!available) return { errors: { username: "Esse username já existe." } };
      } catch (e) { /* segue e deixa o backend validar */ }
    }

    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name: name.trim(), username: username.toLowerCase().trim(), birthdate } },
    });
    if (error) {
      if (/duplicate|unique/i.test(error.message)) return { errors: { email: "Esse e-mail já está cadastrado." } };
      return { errors: { general: error.message } };
    }

    let profileId = data.user?.id;
    if (avatarFile && profileId && data.session) {
      try {
        const url = await api.uploadImage("avatars", profileId, avatarFile, 300);
        await api.updateProfile(profileId, { avatar_url: url });
      } catch (e) { /* avatar é opcional, ignora falha */ }
    }

    if (!data.session) return { ok: true, needsConfirmation: true };
    await loadProfile(profileId);
    return { ok: true, needsConfirmation: false };
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "E-mail ou senha incorretos." };
    const p = await loadProfile(data.user.id);
    if (p?.is_suspended) {
      await supabase.auth.signOut();
      setProfile(null);
      return { error: "Sua conta foi suspensa. Fale com a administração." };
    }
    return { ok: true };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function refreshProfile() {
    if (session?.user) await loadProfile(session.user.id);
  }

  async function updateMyProfile(patch) {
    await api.updateProfile(session.user.id, patch);
    setProfile((p) => ({ ...p, ...patch }));
  }
  async function updateMySettings(patch) {
    await api.updateSettings(session.user.id, patch);
    setSettings((s) => ({ ...s, ...patch }));
  }

  const value = {
    session, user: session?.user || null, profile, settings, loading,
    signUp, signIn, signOut, refreshProfile, updateMyProfile, updateMySettings,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
