import { useEffect, useState } from "react";
import * as api from "../api";
import { useAuth } from "../context/AuthContext";
import { Avatar, Switch } from "../components/Shared";
import { STATUS_OPTIONS } from "../helpers";

const LABELS = {
  perfil_publico: "Perfil público (visível para todos)",
  permitir_solicitacoes: "Permitir solicitações de amizade",
  permitir_recados: "Permitir recados no meu perfil",
  mostrar_visitantes: "Mostrar quem visitou meu perfil",
  mostrar_nascimento: "Mostrar minha data de nascimento",
  mostrar_cidade: "Mostrar minha cidade",
  mostrar_amigos: "Mostrar minha lista de amigos",
};

export default function SettingsPage({ toast, go }) {
  const { profile: u, user, settings, updateMyProfile, updateMySettings } = useAuth();
  const [blocked, setBlocked] = useState([]);

  useEffect(() => {
    api.getMyBlocks(u.id).then(async (rows) => {
      const map = await api.getProfilesByIds(rows.map((r) => r.blocked_id));
      setBlocked(rows.map((r) => map[r.blocked_id]).filter(Boolean));
    });
  }, [u.id]);

  async function setPrivacy(k, v) {
    try { await updateMySettings({ [k]: v }); } catch (e) { toast("Erro: " + e.message, "err"); }
  }
  async function unblock(id) {
    await api.unblockUser(u.id, id);
    setBlocked((b) => b.filter((x) => x.id !== id));
  }

  if (!settings) return <div className="hint">Carregando…</div>;

  return (
    <>
      <div className="card">
        <h3>Conta</h3>
        <div style={{ fontSize: 13.5, color: "var(--muted)" }}>Nome: <strong style={{ color: "var(--ink)" }}>{u.name}</strong></div>
        <div style={{ fontSize: 13.5, color: "var(--muted)" }}>E-mail: <strong style={{ color: "var(--ink)" }}>{user?.email}</strong></div>
        <div style={{ fontSize: 13.5, color: "var(--muted)" }}>Username: <strong style={{ color: "var(--ink)" }}>@{u.username}</strong></div>
      </div>
      <div className="card">
        <h3>Status</h3>
        <select value={u.status} onChange={(e) => updateMyProfile({ status: e.target.value }).catch((err) => toast(err.message, "err"))} style={{ width: "100%", padding: "9px 13px", borderRadius: 10, border: "1.5px solid var(--line)", fontFamily: "inherit" }}>
          {STATUS_OPTIONS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
      </div>
      <div className="card">
        <h3>Privacidade</h3>
        {Object.entries(LABELS).map(([k, label]) => (
          <div className="switch-row" key={k}>
            <span style={{ fontSize: 13.5 }}>{label}</span>
            <Switch on={!!settings[k]} onToggle={() => setPrivacy(k, !settings[k])} />
          </div>
        ))}
      </div>
      <div className="card">
        <h3>Usuários bloqueados</h3>
        {blocked.length === 0 ? <div className="hint">Nenhum usuário bloqueado.</div> : blocked.map((b) => (
          <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
            <Avatar profile={b} size={32} /><div style={{ flex: 1, fontSize: 13.5 }}>{b.name}</div>
            <button className="link-btn" onClick={() => unblock(b.id)}>desbloquear</button>
          </div>
        ))}
      </div>
    </>
  );
}
