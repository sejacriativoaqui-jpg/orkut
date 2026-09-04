import { useEffect, useState, useCallback } from "react";
import * as api from "../api";
import { EmptyState } from "../components/Shared";
import { CATEGORIAS, slugify } from "../helpers";

export default function CommunitiesPage({ me, go, toast }) {
  const [tab, setTab] = useState("populares");
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [all, setAll] = useState([]);
  const [memberOf, setMemberOf] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [communities, myIds] = await Promise.all([api.listCommunities(), api.getMyCommunityIds(me.id)]);
      const withCounts = await Promise.all(communities.map(async (c) => ({ ...c, memberCount: (await api.getCommunityMembers(c.id)).length })));
      setAll(withCounts);
      setMemberOf(myIds);
    } catch (e) { toast("Erro ao carregar comunidades: " + e.message, "err"); }
    finally { setLoading(false); }
  }, [me.id]);

  useEffect(() => { load(); }, [load]);

  let list = all;
  if (tab === "populares") list = [...list].sort((a, b) => b.memberCount - a.memberCount);
  if (tab === "recentes") list = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (tab === "minhas") list = list.filter((c) => memberOf.includes(c.id));
  if (q) list = list.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <h3 style={{ margin: 0 }}>Comunidades</h3>
          <button className="ork-btn ork-btn-primary ork-btn-sm" style={{ width: "auto" }} onClick={() => setShowCreate(true)}>+ Criar comunidade</button>
        </div>
        <input placeholder="Buscar comunidades..." value={q} onChange={(e) => setQ(e.target.value)} style={{ width: "100%", border: "1.5px solid var(--line)", borderRadius: 10, padding: "8px 12px", margin: "12px 0", fontFamily: "inherit" }} />
        <div className="ork-tabsbar" style={{ marginTop: 0 }}>
          {["populares", "recentes", "minhas"].map((t) => <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>)}
        </div>
      </div>
      <div className="card">
        {loading ? <div className="hint">Carregando…</div> : list.length === 0 ? <EmptyState icon="🌐" text="Nenhuma comunidade encontrada." /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {list.map((c) => (
              <div key={c.id} className="ork-comm-card" onClick={() => go("community", { slug: c.slug })}>
                <div className="ork-comm-thumb">{c.image_url ? <img src={c.image_url} alt="" /> : c.name[0]}</div>
                <div style={{ flex: 1 }}>
                  <strong>{c.name}</strong> <span className="chip chip-cat" style={{ marginLeft: 6 }}>{c.category}</span>
                  <div className="hint">{c.memberCount} membros</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showCreate && <CreateCommunityModal me={me} onClose={() => setShowCreate(false)} onCreated={(slug) => { setShowCreate(false); go("community", { slug }); }} toast={toast} />}
    </>
  );
}

function CreateCommunityModal({ me, onClose, onCreated, toast }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState(CATEGORIAS[0]);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  function onFile(e) { const f = e.target.files[0]; if (!f) return; setFile(f); setPreview(URL.createObjectURL(f)); }

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      let imageUrl = null;
      const slug = slugify(name) + "-" + Math.random().toString(36).slice(2, 6);
      if (file) imageUrl = await api.uploadImage("communities", me.id, file, 300);
      await api.createCommunity({ slug, name, description: desc, category, imageUrl, creatorId: me.id });
      toast("Comunidade criada!");
      onCreated(slug);
    } catch (err) { toast("Erro ao criar comunidade: " + err.message, "err"); }
    finally { setSaving(false); }
  }

  return (
    <div className="ork-modal-bg" onClick={onClose}>
      <div className="ork-modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Criar comunidade</h3>
        <form onSubmit={submit}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: "var(--lilac-50)", overflow: "hidden" }}>{preview && <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}</div>
            <label className="link-btn" style={{ cursor: "pointer" }}>Imagem<input type="file" accept="image/*" style={{ display: "none" }} onChange={onFile} /></label>
          </div>
          <div className="ork-field"><label>Nome</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Eu odeio acordar cedo" /></div>
          <div className="ork-field"><label>Descrição</label><textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div className="ork-field">
            <label>Categoria</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="ork-btn ork-btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="ork-btn ork-btn-primary" disabled={saving}>{saving ? "Criando…" : "Criar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
