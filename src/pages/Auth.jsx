import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function AuthPage({ toast }) {
  const [tab, setTab] = useState("login");
  const [confirmSent, setConfirmSent] = useState(false);

  if (confirmSent) {
    return (
      <div className="ork-landing">
        <div className="ork-authcard" style={{ maxWidth: 440, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>📧</div>
          <h2>Confirme seu e-mail</h2>
          <p className="sub">Enviamos um link de confirmação. Depois de confirmar, é só voltar aqui e fazer login.</p>
          <button className="ork-btn ork-btn-ghost" onClick={() => { setConfirmSent(false); setTab("login"); }}>Voltar para o login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ork-landing">
      <div className="ork-landing-wrap">
        <div className="ork-hero">
          <h1 className="brand">ork<span>ut</span></h1>
          <p className="tag">"A rede social que nunca deveria ter acabado."</p>
          <div className="bullets">
            <div><span className="dot" /> Reencontre a nostalgia dos recados e depoimentos</div>
            <div><span className="dot" /> Participe de comunidades sobre qualquer assunto</div>
            <div><span className="dot" /> Veja quem visitou seu perfil</div>
            <div><span className="dot" /> Confira sua Sorte do Dia</div>
          </div>
        </div>
        <div className="ork-authcard">
          <div className="ork-tabs">
            <button className={`ork-tab ${tab === "login" ? "active" : ""}`} onClick={() => setTab("login")}>Entrar</button>
            <button className={`ork-tab ${tab === "signup" ? "active" : ""}`} onClick={() => setTab("signup")}>Criar conta</button>
          </div>
          {tab === "login" ? <LoginForm toast={toast} /> : <SignupForm toast={toast} onNeedsConfirmation={() => setConfirmSent(true)} />}
        </div>
      </div>
    </div>
  );
}

function LoginForm({ toast }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await signIn(email, password);
    setLoading(false);
    if (res.error) setError(res.error);
  }
  return (
    <form onSubmit={submit}>
      <h2>Bem-vindo(a) de volta</h2>
      <p className="sub">Acesse o Orkut com sua conta.</p>
      <div className="ork-field">
        <label>E-mail</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@gmail.com" />
      </div>
      <div className="ork-field">
        <label>Senha</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      </div>
      {error && <div className="ork-field err">{error}</div>}
      <button className="ork-btn ork-btn-primary" disabled={loading}>{loading ? "Entrando…" : "Login"}</button>
    </form>
  );
}

function SignupForm({ toast, onNeedsConfirmation }) {
  const { signUp } = useAuth();
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "", birthdate: "", avatarFile: null });
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function onFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    set("avatarFile", f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    const res = await signUp({ ...form, username: form.username.toLowerCase().trim() });
    setLoading(false);
    if (res.errors) { setErrors(res.errors); return; }
    setErrors({});
    if (res.needsConfirmation) onNeedsConfirmation();
    else toast("Conta criada com sucesso!");
  }

  return (
    <form onSubmit={submit}>
      <h2>Criar sua conta</h2>
      <p className="sub">Leva menos de um minuto.</p>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--lilac-50)", overflow: "hidden", flexShrink: 0, border: "1.5px dashed var(--line)" }}>
          {preview && <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        </div>
        <label className="link-btn" style={{ cursor: "pointer" }}>
          Foto de perfil (opcional)
          <input type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
        </label>
      </div>
      <div className="ork-field">
        <label>Nome</label>
        <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Seu nome completo" />
        {errors.name && <div className="err">{errors.name}</div>}
      </div>
      <div className="ork-field">
        <label>Username</label>
        <input value={form.username} onChange={(e) => set("username", e.target.value.toLowerCase())} placeholder="ex: joaosilva" />
        {errors.username ? <div className="err">{errors.username}</div> : <div className="hint">orkut.app/{form.username || "seu-username"}</div>}
      </div>
      <div className="ork-field">
        <label>E-mail</label>
        <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="voce@gmail.com" />
        {errors.email && <div className="err">{errors.email}</div>}
      </div>
      <div className="ork-row2">
        <div className="ork-field">
          <label>Senha</label>
          <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="mín. 6 caracteres" />
          {errors.password && <div className="err">{errors.password}</div>}
        </div>
        <div className="ork-field">
          <label>Nascimento</label>
          <input type="date" value={form.birthdate} onChange={(e) => set("birthdate", e.target.value)} />
          {errors.birthdate && <div className="err">{errors.birthdate}</div>}
        </div>
      </div>
      <div className="hint" style={{ marginBottom: 12 }}>É preciso ter 18 anos ou mais para se cadastrar.</div>
      {errors.general && <div className="ork-field err">{errors.general}</div>}
      <button className="ork-btn ork-btn-primary" disabled={loading}>{loading ? "Criando…" : "Criar conta"}</button>
    </form>
  );
}
