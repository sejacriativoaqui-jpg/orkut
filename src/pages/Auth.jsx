import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function AuthPage({ toast }) {
  const { passwordRecovery } = useAuth();

  const [screen, setScreen] = useState("login");
  const [confirmSent, setConfirmSent] = useState(false);

  // Quando o usuário chega pelo link enviado pelo Supabase,
  // mostramos diretamente a criação da nova senha.
  if (passwordRecovery) {
    return (
      <AuthLayout>
        <NewPasswordForm
          toast={toast}
          onFinished={() => setScreen("login")}
        />
      </AuthLayout>
    );
  }

  // Tela após criação de conta com confirmação por e-mail.
  if (confirmSent) {
    return (
      <AuthLayout>
        <div className="ork-auth-message">
          <div className="ork-auth-message-icon">✉</div>

          <h2>Confirme seu e-mail</h2>

          <p className="sub">
            Enviamos uma mensagem para o seu e-mail.
            Clique no link para confirmar sua conta.
          </p>

          <button
            type="button"
            className="ork-btn ork-btn-primary"
            onClick={() => {
              setConfirmSent(false);
              setScreen("login");
            }}
          >
            Voltar para o login
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      {screen === "login" && (
        <LoginForm
          onForgot={() => setScreen("forgot")}
        />
      )}

      {screen === "signup" && (
        <SignupForm
          toast={toast}
          onNeedsConfirmation={() => setConfirmSent(true)}
          onLogin={() => setScreen("login")}
        />
      )}

      {screen === "forgot" && (
        <ForgotPasswordForm
          onBack={() => setScreen("login")}
        />
      )}

      {screen === "login" && (
        <div className="ork-classic-signup-box">
          <span>Ainda não é membro?</span>

          <button
            type="button"
            className="ork-classic-create-link"
            onClick={() => setScreen("signup")}
          >
            ENTRE JÁ
          </button>
        </div>
      )}
    </AuthLayout>
  );
}

/* =========================================================
   ESTRUTURA DA TELA
========================================================= */

function AuthLayout({ children }) {
  return (
    <div className="ork-landing ork-classic-login">
      <div className="ork-classic-wrapper">

        <main className="ork-classic-intro">
          <div className="ork-classic-brand">
            ork<span>ut</span>
          </div>

          <div className="ork-classic-description">
            <p>
              <strong>Conecte-se</strong> aos seus amigos e familiares
              usando recados e mensagens instantâneas.
            </p>

            <p>
              <strong>Conheça</strong> novas pessoas através de amigos
              de seus amigos e comunidades.
            </p>

            <p>
              <strong>Compartilhe</strong> seus vídeos, fotos e paixões
              em um só lugar.
            </p>
          </div>
        </main>

        <aside className="ork-classic-auth-side">
          {children}
        </aside>

      </div>

      <footer className="ork-classic-footer">
        <span>© 2026 Orkut Nostalgia</span>
        <span className="sep">-</span>
        <a href="#" onClick={(e) => e.preventDefault()}>
          Sobre
        </a>
        <span className="sep">-</span>
        <a href="#" onClick={(e) => e.preventDefault()}>
          Privacidade
        </a>
        <span className="sep">-</span>
        <a href="#" onClick={(e) => e.preventDefault()}>
          Termos
        </a>
      </footer>
    </div>
  );
}

/* =========================================================
   LOGIN
========================================================= */

function LoginForm({ onForgot }) {
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    const res = await signIn(
      email.trim(),
      password
    );

    setLoading(false);

    if (res?.error) {
      setError(res.error);
    }
  }

  return (
    <div className="ork-classic-login-box">
      <div className="ork-classic-login-title">
        Já é membro?
      </div>

      <form onSubmit={submit}>
        <div className="ork-classic-field">
          <label>E-mail:</label>

          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="ork-classic-field">
          <label>Senha:</label>

          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <div className="ork-classic-error">
            {error}
          </div>
        )}

        <div className="ork-classic-login-actions">
          <button
            type="submit"
            className="ork-classic-button"
            disabled={loading}
          >
            {loading ? "entrando..." : "entrar"}
          </button>
        </div>

        <div className="ork-classic-help">
          <button
            type="button"
            className="ork-classic-link-button"
            onClick={onForgot}
          >
            Não consegue acessar sua conta?
          </button>
        </div>
      </form>
    </div>
  );
}

/* =========================================================
   RECUPERAÇÃO DE SENHA
========================================================= */

function ForgotPasswordForm({ onBack }) {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    const res = await resetPassword(email.trim());

    setLoading(false);

    if (res?.error) {
      setError(res.error);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="ork-classic-login-box">
        <div className="ork-classic-login-title">
          Verifique seu e-mail
        </div>

        <div className="ork-classic-recovery">
          <div className="ork-classic-mail-icon">
            ✉
          </div>

          <p>
            Enviamos as instruções para redefinir
            sua senha para:
          </p>

          <strong>{email}</strong>

          <p className="ork-classic-small">
            Clique no link recebido para criar
            uma nova senha.
          </p>

          <button
            type="button"
            className="ork-classic-link-button"
            onClick={onBack}
          >
            voltar para o login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ork-classic-login-box">
      <div className="ork-classic-login-title">
        Recupere sua conta
      </div>

      <form onSubmit={submit}>
        <p className="ork-classic-recovery-text">
          Digite o endereço de e-mail usado
          para criar sua conta.
        </p>

        <div className="ork-classic-field">
          <label>E-mail:</label>

          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {error && (
          <div className="ork-classic-error">
            {error}
          </div>
        )}

        <div className="ork-classic-login-actions">
          <button
            type="submit"
            className="ork-classic-button"
            disabled={loading}
          >
            {loading
              ? "enviando..."
              : "enviar instruções"}
          </button>
        </div>

        <div className="ork-classic-help">
          <button
            type="button"
            className="ork-classic-link-button"
            onClick={onBack}
          >
            ← voltar para o login
          </button>
        </div>
      </form>
    </div>
  );
}

/* =========================================================
   NOVA SENHA
========================================================= */

function NewPasswordForm({ toast, onFinished }) {
  const { updatePassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();

    setError("");

    if (password.length < 6) {
      setError(
        "A senha precisa ter pelo menos 6 caracteres."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não são iguais.");
      return;
    }

    setLoading(true);

    const res = await updatePassword(password);

    setLoading(false);

    if (res?.error) {
      setError(res.error);
      return;
    }

    setSuccess(true);

    if (toast) {
      toast("Senha alterada com sucesso!");
    }
  }

  if (success) {
    return (
      <div className="ork-classic-login-box">
        <div className="ork-classic-login-title">
          Senha alterada
        </div>

        <div className="ork-classic-recovery">
          <div className="ork-classic-success-icon">
            ✓
          </div>

          <p>
            Sua nova senha foi salva com sucesso.
          </p>

          <button
            type="button"
            className="ork-classic-button"
            onClick={onFinished}
          >
            continuar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ork-classic-login-box">
      <div className="ork-classic-login-title">
        Crie uma nova senha
      </div>

      <form onSubmit={submit}>
        <p className="ork-classic-recovery-text">
          Escolha uma nova senha para acessar
          sua conta.
        </p>

        <div className="ork-classic-field">
          <label>Nova senha:</label>

          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
          />
        </div>

        <div className="ork-classic-field">
          <label>Confirmar senha:</label>

          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(e.target.value)
            }
          />
        </div>

        {error && (
          <div className="ork-classic-error">
            {error}
          </div>
        )}

        <div className="ork-classic-login-actions">
          <button
            type="submit"
            className="ork-classic-button"
            disabled={loading}
          >
            {loading
              ? "salvando..."
              : "salvar nova senha"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* =========================================================
   CADASTRO
========================================================= */

function SignupForm({
  toast,
  onNeedsConfirmation,
  onLogin,
}) {
  const { signUp } = useAuth();

  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    birthdate: "",
    avatarFile: null,
  });

  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function set(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function onFile(e) {
    const file = e.target.files?.[0];

    if (!file) return;

    set("avatarFile", file);

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setPreview(URL.createObjectURL(file));
  }

  async function submit(e) {
    e.preventDefault();

    setLoading(true);
    setErrors({});

    const res = await signUp({
      ...form,
      username: form.username
        .toLowerCase()
        .trim(),
    });

    setLoading(false);

    if (res?.errors) {
      setErrors(res.errors);
      return;
    }

    if (res?.needsConfirmation) {
      onNeedsConfirmation();
      return;
    }

    if (toast) {
      toast("Conta criada com sucesso!");
    }
  }

  return (
    <div className="ork-classic-login-box ork-classic-signup-form">
      <div className="ork-classic-login-title">
        Crie sua conta
      </div>

      <form onSubmit={submit}>
        <div className="ork-classic-avatar-register">
          <div className="ork-classic-avatar-preview">
            {preview ? (
              <img
                src={preview}
                alt="Prévia da foto de perfil"
              />
            ) : (
              <span>foto</span>
            )}
          </div>

          <label className="ork-classic-upload">
            adicionar foto
            <input
              type="file"
              accept="image/*"
              onChange={onFile}
            />
          </label>
        </div>

        <div className="ork-classic-field">
          <label>Nome:</label>

          <input
            value={form.name}
            onChange={(e) =>
              set("name", e.target.value)
            }
          />

          {errors.name && (
            <div className="ork-classic-error">
              {errors.name}
            </div>
          )}
        </div>

        <div className="ork-classic-field">
          <label>Username:</label>

          <input
            value={form.username}
            onChange={(e) =>
              set(
                "username",
                e.target.value.toLowerCase()
              )
            }
          />

          {errors.username && (
            <div className="ork-classic-error">
              {errors.username}
            </div>
          )}
        </div>

        <div className="ork-classic-field">
          <label>E-mail:</label>

          <input
            type="email"
            value={form.email}
            onChange={(e) =>
              set("email", e.target.value)
            }
          />

          {errors.email && (
            <div className="ork-classic-error">
              {errors.email}
            </div>
          )}
        </div>

        <div className="ork-classic-field">
          <label>Senha:</label>

          <input
            type="password"
            value={form.password}
            onChange={(e) =>
              set("password", e.target.value)
            }
          />

          {errors.password && (
            <div className="ork-classic-error">
              {errors.password}
            </div>
          )}
        </div>

        <div className="ork-classic-field">
          <label>Nascimento:</label>

          <input
            type="date"
            value={form.birthdate}
            onChange={(e) =>
              set("birthdate", e.target.value)
            }
          />

          {errors.birthdate && (
            <div className="ork-classic-error">
              {errors.birthdate}
            </div>
          )}
        </div>

        <div className="ork-classic-age-note">
          É preciso ter 18 anos ou mais para se cadastrar.
        </div>

        {errors.general && (
          <div className="ork-classic-error">
            {errors.general}
          </div>
        )}

        <div className="ork-classic-login-actions">
          <button
            type="submit"
            className="ork-classic-button"
            disabled={loading}
          >
            {loading
              ? "criando..."
              : "criar minha conta"}
          </button>
        </div>

        <div className="ork-classic-help">
          Já possui uma conta?{" "}

          <button
            type="button"
            className="ork-classic-link-button"
            onClick={onLogin}
          >
            entrar
          </button>
        </div>
      </form>
    </div>
  );
}
