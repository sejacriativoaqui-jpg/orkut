import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function CompleteProfilePage({ toast, onDone }) {
  const { profile, updateMyProfile } = useAuth();
  const [form, setForm] = useState({
    city: profile.city || "", state: profile.state || "", country: profile.country || "Brasil",
    bio: profile.bio || "", quem_sou_eu: profile.quem_sou_eu || "", interesses: profile.interesses || "",
    filmes: profile.filmes || "", musica: profile.musica || "", profissao: profile.profissao || "",
  });
  const [saving, setSaving] = useState(false);
  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateMyProfile({ ...form, profile_complete: true });
      toast(`Perfil completo! Bem-vindo(a) ao Orkut, ${profile.name.split(" ")[0]}.`);
      onDone();
    } catch (err) {
      toast("Não foi possível salvar: " + err.message, "err");
    } finally { setSaving(false); }
  }

  return (
    <div className="ork-landing" style={{ alignItems: "flex-start", paddingTop: 50 }}>
      <div className="ork-authcard" style={{ maxWidth: 520, margin: "0 auto" }}>
        <h2>Complete seu perfil</h2>
        <p className="sub">Só mais alguns detalhes para os seus amigos te encontrarem.</p>
        <form onSubmit={submit}>
          <div className="ork-row2">
            <div className="ork-field"><label>Cidade</label><input value={form.city} onChange={(e) => set("city", e.target.value)} /></div>
            <div className="ork-field"><label>Estado</label><input value={form.state} onChange={(e) => set("state", e.target.value)} /></div>
          </div>
          <div className="ork-field"><label>País</label><input value={form.country} onChange={(e) => set("country", e.target.value)} /></div>
          <div className="ork-field"><label>Profissão</label><input value={form.profissao} onChange={(e) => set("profissao", e.target.value)} /></div>
          <div className="ork-field"><label>Bio (uma frase sobre você)</label><input value={form.bio} onChange={(e) => set("bio", e.target.value)} placeholder="Ex: Sempre rindo à toa." /></div>
          <div className="ork-field"><label>Quem sou eu</label><textarea rows={3} value={form.quem_sou_eu} onChange={(e) => set("quem_sou_eu", e.target.value)} /></div>
          <div className="ork-field"><label>Interesses</label><input value={form.interesses} onChange={(e) => set("interesses", e.target.value)} placeholder="música, games, viagens..." /></div>
          <div className="ork-row2">
            <div className="ork-field"><label>Filmes favoritos</label><input value={form.filmes} onChange={(e) => set("filmes", e.target.value)} /></div>
            <div className="ork-field"><label>Música favorita</label><input value={form.musica} onChange={(e) => set("musica", e.target.value)} /></div>
          </div>
          <button className="ork-btn ork-btn-primary" disabled={saving}>{saving ? "Salvando…" : "Salvar e entrar no Orkut"}</button>
        </form>
      </div>
    </div>
  );
}
