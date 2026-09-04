import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

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

  // Indica que o usuário entrou através de um e-mail
  // de recuperação de senha.
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const loadProfile = useCallback(async (userId) => {
    try {
      const [p, s] = await Promise.all([
        api.getProfileById(userId),
        api.getSettings(userId),
      ]);

      setProfile(p);
      setSettings(s);

      return p;
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
      throw error;
    }
  }, []);

  /*
   * Inicialização da autenticação.
   *
   * O finally garante que a aplicação saia da tela
   * "Carregando o Orkut..." mesmo que a consulta do
   * perfil apresente algum erro.
   */
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Erro ao recuperar sessão:", error);
          return;
        }

        if (!mounted) return;

        setSession(data.session);

        if (data.session?.user) {
          try {
            await loadProfile(data.session.user.id);
          } catch (error) {
            console.error("Não foi possível carregar o perfil:", error);
          }
        }
      } catch (error) {
        console.error("Erro ao iniciar autenticação:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      setSession(newSession);

      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecovery(true);
        setLoading(false);
      }

      if (newSession?.user) {
        /*
         * Executamos fora do callback imediato do Supabase.
         * Isso evita prender o evento de autenticação enquanto
         * fazemos novas consultas ao banco.
         */
        setTimeout(() => {
          if (!mounted) return;

          loadProfile(newSession.user.id).catch((error) => {
            console.error("Erro ao atualizar perfil:", error);
          });
        }, 0);
      } else {
        setProfile(null);
        setSettings(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  // =========================================================
  // CADASTRO
  // =========================================================

  async function signUp({
    name,
    username,
    email,
    password,
    birthdate,
    avatarFile,
  }) {
    const errors = {};

    if (!name.trim()) {
      errors.name = "Informe seu nome.";
    }

    if (!validUsername(username)) {
      errors.username =
        "3–20 caracteres, minúsculas, números ou _.";
    }

    if (!validEmail(email)) {
      errors.email = "E-mail inválido.";
    }

    if (!password || password.length < 6) {
      errors.password = "Mínimo de 6 caracteres.";
    }

    if (!birthdate) {
      errors.birthdate = "Informe sua data de nascimento.";
    } else if (calcAge(birthdate) < 18) {
      errors.birthdate =
        "Você precisa ter 18 anos ou mais para se cadastrar.";
    }

    if (Object.keys(errors).length) {
      return { errors };
    }

    try {
      const available = await api.isUsernameAvailable(username);

      if (!available) {
        return {
          errors: {
            username: "Esse username já existe.",
          },
        };
      }
    } catch (error) {
      console.warn(
        "Não foi possível verificar username antes do cadastro:",
        error
      );
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,

      options: {
        data: {
          name: name.trim(),
          username: username.toLowerCase().trim(),
          birthdate,
        },
      },
    });

    if (error) {
      if (/duplicate|unique/i.test(error.message)) {
        return {
          errors: {
            email: "Esse e-mail já está cadastrado.",
          },
        };
      }

      return {
        errors: {
          general: error.message,
        },
      };
    }

    const profileId = data.user?.id;

    if (avatarFile && profileId && data.session) {
      try {
        const url = await api.uploadImage(
          "avatars",
          profileId,
          avatarFile,
          300
        );

        await api.updateProfile(profileId, {
          avatar_url: url,
        });
      } catch (error) {
        console.warn(
          "Não foi possível enviar o avatar:",
          error
        );
      }
    }

    if (!data.session) {
      return {
        ok: true,
        needsConfirmation: true,
      };
    }

    try {
      await loadProfile(profileId);
    } catch (error) {
      console.error(
        "Conta criada, mas não foi possível carregar o perfil:",
        error
      );
    }

    return {
      ok: true,
      needsConfirmation: false,
    };
  }

  // =========================================================
  // LOGIN
  // =========================================================

  async function signIn(email, password) {
    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        return {
          error: "E-mail ou senha incorretos.",
        };
      }

      let p = null;

      try {
        p = await loadProfile(data.user.id);
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);

        return {
          error:
            "Login realizado, mas não foi possível carregar seu perfil.",
        };
      }

      if (p?.is_suspended) {
        await supabase.auth.signOut();

        setProfile(null);
        setSettings(null);

        return {
          error:
            "Sua conta foi suspensa. Fale com a administração.",
        };
      }

      return {
        ok: true,
      };
    } catch (error) {
      console.error("Erro no login:", error);

      return {
        error: "Não foi possível entrar. Tente novamente.",
      };
    }
  }

  // =========================================================
  // RECUPERAR SENHA
  // =========================================================

  async function resetPassword(email) {
    if (!validEmail(email)) {
      return {
        error: "Informe um e-mail válido.",
      };
    }

    try {
      const redirectTo = `${window.location.origin}/`;

      const { error } =
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
        });

      if (error) {
        console.error(
          "Erro ao solicitar recuperação:",
          error
        );

        return {
          error:
            "Não foi possível enviar o e-mail de recuperação.",
        };
      }

      return {
        ok: true,
      };
    } catch (error) {
      console.error(
        "Erro ao solicitar recuperação:",
        error
      );

      return {
        error:
          "Não foi possível enviar o e-mail de recuperação.",
      };
    }
  }

  // =========================================================
  // DEFINIR NOVA SENHA
  // =========================================================

  async function updatePassword(newPassword) {
    if (!newPassword || newPassword.length < 6) {
      return {
        error: "A nova senha precisa ter pelo menos 6 caracteres.",
      };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error("Erro ao atualizar senha:", error);

        return {
          error: "Não foi possível alterar sua senha.",
        };
      }

      setPasswordRecovery(false);

      return {
        ok: true,
      };
    } catch (error) {
      console.error("Erro ao atualizar senha:", error);

      return {
        error: "Não foi possível alterar sua senha.",
      };
    }
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  async function signOut() {
    await supabase.auth.signOut();

    setSession(null);
    setProfile(null);
    setSettings(null);
    setPasswordRecovery(false);
  }

  // =========================================================
  // PERFIL
  // =========================================================

  async function refreshProfile() {
    if (!session?.user) return;

    try {
      await loadProfile(session.user.id);
    } catch (error) {
      console.error(
        "Erro ao atualizar perfil:",
        error
      );
    }
  }

  async function updateMyProfile(patch) {
    if (!session?.user) return;

    await api.updateProfile(session.user.id, patch);

    setProfile((current) => ({
      ...current,
      ...patch,
    }));
  }

  async function updateMySettings(patch) {
    if (!session?.user) return;

    await api.updateSettings(session.user.id, patch);

    setSettings((current) => ({
      ...current,
      ...patch,
    }));
  }

  const value = {
    session,
    user: session?.user || null,
    profile,
    settings,
    loading,

    passwordRecovery,

    signUp,
    signIn,
    signOut,

    resetPassword,
    updatePassword,

    refreshProfile,
    updateMyProfile,
    updateMySettings,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
