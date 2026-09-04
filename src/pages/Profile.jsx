import { useEffect, useState, useCallback } from "react";
import * as api from "../api";
import { useAuth } from "../context/AuthContext";
import { Avatar, EmptyState, ReportModal, StatBox } from "../components/Shared";
import { STATUS_OPTIONS } from "../helpers";

export default function ProfilePage({ username, go, toast }) {
  const { profile: me, settings, updateMyProfile, refreshProfile } = useAuth();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("sobre");
  const [friendIds, setFriendIds] = useState([]);
  const [sentReqs, setSentReqs] = useState([]);
  const [receivedReqs, setReceivedReqs] = useState([]);
  const [myBlocks, setMyBlocks] = useState([]);
  const [testimonialCount, setTestimonialCount] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const isSelf = me.username === username;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const u = isSelf ? me : await api.getProfileByUsername(username);
      setUser(u);
      if (!u) return;
      const [fIds, sent, received, blocks, testimonials] = await Promise.all([
        api.getFriendIds(u.id),
        api.getSentRequests(me.id),
        api.getReceivedRequests(me.id),
        api.getMyBlocks(me.id),
        api.getTestimonials(u.id),
      ]);
      setFriendIds(fIds);
      setSentReqs(sent);
      setReceivedReqs(received);
      setMyBlocks(blocks);
      setTestimonialCount(testimonials.filter((t) => t.approved).length);
      if (!isSelf) await api.logVisit(u.id, me.id);
    } catch (e) {
      toast("Erro ao carregar perfil: " + e.message, "err");
    } finally { setLoading(false); }
  }, [username, me.id]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [username]);

  // comunidades do usuário visitado (query separada, mais simples que embutir acima)
  const [userCommunities, setUserCommunities] = useState([]);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { supabase } = await import("../supabaseClient");
      const { data } = await supabase.from("community_members").select("community_id, communities(*)").eq("user_id", user.id);
      setUserCommunities((data || []).map((r) => r.communities).filter(Boolean));
    })();
  }, [user?.id]);

  if (loading && !user) return <div className="hint">Carregando…</div>;
  if (!user) return <EmptyState icon="🚫" text="Este perfil não existe." />;

  const isBlockedByMe = myBlocks.some((b) => b.blocked_id === user.id);
  const status = isSelf ? "self"
    : isBlockedByMe ? "blockedByMe"
    : friendIds.includes(me.id) ? "friends"
    : sentReqs.some((r) => r.to_user === user.id) ? "sent"
    : receivedReqs.some((r) => r.from_user === user.id) ? "received"
    : "none";

  return (
    <>
      <div>
        <div className="ork-cover">{user.cover_url && <img src={user.cover_url} alt="" />}</div>
        <div className="ork-profile-head">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
            <div className="ork-avatar-lg">
              {user.avatar_url ? <img src={user.avatar_url} alt="" /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 34, fontWeight: 700 }}>{user.name[0]}</div>}
            </div>
            <div style={{ marginLeft: -4, flex: 1, minWidth: 200 }}>
              <h2 style={{ margin: "6px 0 0", fontSize: 21 }}>{user.name} {user.is_admin && <span className="chip" title="Administrador">👑 admin</span>}</h2>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                @{user.username}{user.city && <> · {user.city}{user.state ? `, ${user.state}` : ""}</>}
              </div>
              <div style={{ marginTop: 6, fontSize: 13 }}>
                <span className="ork-status-dot" style={{ background: STATUS_OPTIONS.find((s) => s.v === user.status)?.color }} />
                {STATUS_OPTIONS.find((s) => s.v === user.status)?.label}
              </div>
            </div>
            <ProfileActions
              me={me} user={user} isSelf={isSelf} status={status}
              onReport={() => setShowReport(true)}
              onEdit={() => setEditing(true)}
              onChanged={load}
              toast={toast}
            />
          </div>
          {user.bio && <p style={{ fontStyle: "italic", color: "var(--purple-900)", marginTop: 10 }}>"{user.bio}"</p>}
          <div className="ork-stats">
            <div><div className="n">{friendIds.length}</div><div className="l">amigos</div></div>
            <div><div className="n">{userCommunities.length}</div><div className="l">comunidades</div></div>
            <div><div className="n">{(user.avatar_url ? 1 : 0) + (user.cover_url ? 1 : 0)}</div><div className="l">fotos</div></div>
            <div><div className="n">{testimonialCount}</div><div className="l">depoimentos</div></div>
          </div>
          <div className="ork-tabsbar">
            {["sobre", "recados", "depoimentos", "fotos", "comunidades", "amigos"].map((t) => (
              <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
            ))}
          </div>
        </div>
      </div>

      {tab === "sobre" && <SobreTab user={user} isSelf={isSelf} meId={me.id} />}
      {tab === "recados" && <ScrapsTab profileId={user.id} isSelf={isSelf} meId={me.id} toast={toast} go={go} />}
      {tab === "depoimentos" && <TestimonialsTab profileId={user.id} isSelf={isSelf} meId={me.id} toast={toast} go={go} onChanged={load} />}
      {tab === "fotos" && (
        <div className="card">
          <h3>Fotos</h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {user.avatar_url && <img src={user.avatar_url} alt="" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 12 }} />}
            {user.cover_url && <img src={user.cover_url} alt="" style={{ width: 200, height: 120, objectFit: "cover", borderRadius: 12 }} />}
            {!user.avatar_url && !user.cover_url && <EmptyState icon="📷" text="Nenhuma foto ainda." />}
          </div>
          <div className="hint" style={{ marginTop: 10 }}>Álbuns completos (tabelas albums/photos já existem no banco) chegam em uma próxima versão da interface.</div>
        </div>
      )}
      {tab === "comunidades" && (
        <div className="card">
          <h3>Comunidades</h3>
          {userCommunities.length === 0 ? <EmptyState icon="🌐" text="Nenhuma comunidade ainda." /> : userCommunities.map((c) => (
            <div key={c.id} className="ork-comm-card" onClick={() => go("community", { slug: c.slug })}>
              <div className="ork-comm-thumb">{c.image_url ? <img src={c.image_url} alt="" /> : c.name[0]}</div>
              <div><strong>{c.name}</strong></div>
            </div>
          ))}
        </div>
      )}
      {tab === "amigos" && <FriendsTab userId={user.id} canSee={user.username === me.username || true} go={go} />}

      {showReport && <ReportModal targetType="perfil" targetLabel={`o perfil de ${user.name}`} onClose={() => setShowReport(false)} onSubmit={(reason, detail) => api.addReport({ reporterId: me.id, targetType: "perfil", targetId: user.id, targetLabel: user.name, reason, detail }).then(() => toast("Denúncia enviada. Nossa equipe vai analisar."))} />}
      {editing && <EditProfileModal onClose={() => setEditing(false)} toast={toast} />}
    </>
  );
}

function SobreTab({ user, isSelf, meId }) {
  const [visitors, setVisitors] = useState([]);
  useEffect(() => {
    if (isSelf) api.getVisitors(user.id).then(async (rows) => {
      const ids = [...new Set(rows.map((r) => r.visitor_id))].slice(0, 12);
      const map = await api.getProfilesByIds(ids);
      setVisitors(ids.map((id) => map[id]).filter(Boolean));
    });
  }, [user.id, isSelf]);

  const rows = [
    ["Quem sou eu", user.quem_sou_eu], ["Interesses", user.interesses], ["Filmes", user.filmes],
    ["Música", user.musica], ["Livros", user.livros], ["Esportes", user.esportes],
    ["Relacionamento", user.relacionamento], ["Profissão", user.profissao],
  ];
  return (
    <div className="card">
      <h3>Sobre</h3>
      {rows.map(([label, v]) => v ? <div key={label} style={{ marginBottom: 8, fontSize: 13.5 }}><strong style={{ color: "var(--purple-900)" }}>{label}:</strong> {v}</div> : null)}
      {user.birthdate && <div style={{ marginBottom: 8, fontSize: 13.5 }}><strong style={{ color: "var(--purple-900)" }}>Nascimento:</strong> {new Date(user.birthdate + "T00:00:00").toLocaleDateString("pt-BR")}</div>}
      {isSelf && (
        <>
          <h3 style={{ marginTop: 18 }}>Quem visitou meu perfil</h3>
          {visitors.length === 0 ? <div className="hint">Ninguém ainda.</div> : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {visitors.map((v) => <Avatar key={v.id} profile={v} size={34} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ScrapsTab({ profileId, isSelf, meId, toast, go }) {
  const [scraps, setScraps] = useState([]);
  const [authors, setAuthors] = useState({});
  const [text, setText] = useState("");
  const load = useCallback(async () => {
    const rows = await api.getScraps(profileId);
    setScraps(rows);
    setAuthors(await api.getProfilesByIds([...new Set(rows.map((r) => r.author_id))]));
  }, [profileId]);
  useEffect(() => { load(); }, [load]);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    try { await api.addScrap(profileId, meId, text); setText(""); toast("Recado publicado!"); load(); }
    catch (err) { toast("Não foi possível publicar: " + err.message, "err"); }
  }
  return (
    <div className="card">
      <h3>Recados</h3>
      {meId !== profileId && (
        <form style={{ display: "flex", gap: 6, marginBottom: 14 }} onSubmit={submit}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Deixe um recado..." style={{ flex: 1, border: "1.5px solid var(--line)", borderRadius: 20, padding: "8px 14px", fontFamily: "inherit" }} />
          <button className="ork-btn ork-btn-primary ork-btn-sm" style={{ width: "auto" }}>Enviar</button>
        </form>
      )}
      {scraps.length === 0 ? <EmptyState icon="💬" text="Nenhum recado ainda." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {scraps.map((s) => {
            const author = authors[s.author_id];
            const canDel = isSelf || s.author_id === meId;
            return (
              <div key={s.id} style={{ display: "flex", gap: 10 }}>
                <Avatar profile={author} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}><button className="link-btn" onClick={() => go("profile", { username: author?.username })}>{author?.name}</button></div>
                  <div style={{ fontSize: 13.5 }}>{s.text}</div>
                  {canDel && <button className="link-btn" style={{ fontSize: 11.5, color: "var(--muted)" }} onClick={() => api.deleteScrap(s.id).then(load)}>excluir</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TestimonialsTab({ profileId, isSelf, meId, toast, go, onChanged }) {
  const [items, setItems] = useState([]);
  const [authors, setAuthors] = useState({});
  const [text, setText] = useState("");
  const load = useCallback(async () => {
    const rows = (await api.getTestimonials(profileId)).filter((t) => t.approved || isSelf || t.author_id === meId);
    setItems(rows);
    setAuthors(await api.getProfilesByIds([...new Set(rows.map((r) => r.author_id))]));
  }, [profileId, isSelf, meId]);
  useEffect(() => { load(); }, [load]);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    await api.writeTestimonial(profileId, meId, text);
    setText("");
    toast("Depoimento enviado para aprovação!");
    load();
  }
  return (
    <div className="card">
      <h3>Depoimentos</h3>
      {meId !== profileId && (
        <form style={{ display: "flex", gap: 6, marginBottom: 14 }} onSubmit={submit}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva um depoimento..." style={{ flex: 1, border: "1.5px solid var(--line)", borderRadius: 20, padding: "8px 14px", fontFamily: "inherit" }} />
          <button className="ork-btn ork-btn-primary ork-btn-sm" style={{ width: "auto" }}>Enviar</button>
        </form>
      )}
      {items.length === 0 ? <EmptyState icon="📝" text="Nenhum depoimento ainda." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((t) => {
            const author = authors[t.author_id];
            return (
              <div key={t.id} style={{ display: "flex", gap: 10 }}>
                <Avatar profile={author} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>
                    <button className="link-btn" onClick={() => go("profile", { username: author?.username })}>{author?.name}</button>
                    {!t.approved && <span className="chip" style={{ marginLeft: 6 }}>aguardando aprovação</span>}
                  </div>
                  <div style={{ fontSize: 13.5 }}>{t.text}</div>
                  <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
                    {isSelf && !t.approved && <button className="link-btn" onClick={() => api.approveTestimonial(t.id).then(() => { toast("Depoimento aprovado!"); load(); onChanged(); })}>aprovar</button>}
                    {(isSelf || t.author_id === meId) && <button className="link-btn" style={{ color: "var(--muted)" }} onClick={() => api.deleteTestimonial(t.id).then(() => { load(); onChanged(); })}>excluir</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FriendsTab({ userId, go }) {
  const [friends, setFriends] = useState([]);
  useEffect(() => {
    (async () => {
      const ids = await api.getFriendIds(userId);
      const map = await api.getProfilesByIds(ids);
      setFriends(ids.map((id) => map[id]).filter(Boolean));
    })();
  }, [userId]);
  return (
    <div className="card">
      <h3>Amigos</h3>
      {friends.length === 0 ? <EmptyState icon="👥" text="Nenhum amigo ainda." /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 4 }}>
          {friends.map((f) => (
            <div key={f.id} className="friend-card" style={{ cursor: "pointer" }} onClick={() => go("profile", { username: f.username })}>
              <Avatar profile={f} size={44} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{f.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>@{f.username}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileActions({ me, user, isSelf, status, onReport, onEdit, onChanged, toast }) {
  const [showScrapBox, setShowScrapBox] = useState(false);
  const [showTestBox, setShowTestBox] = useState(false);
  const [scrapText, setScrapText] = useState("");
  const [testText, setTestText] = useState("");

  if (isSelf) return <button className="ork-btn ork-btn-ghost ork-btn-sm" onClick={onEdit}>✏️ Editar perfil</button>;

  async function act(fn) { try { await fn(); onChanged(); } catch (e) { toast(e.message, "err"); } }

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {status === "none" && <button className="ork-btn ork-btn-primary ork-btn-sm" style={{ width: "auto" }} onClick={() => act(() => api.sendFriendRequest(me.id, user.id).then(() => toast("Solicitação enviada!")))}>+ Adicionar amigo</button>}
      {status === "sent" && <button className="ork-btn ork-btn-ghost ork-btn-sm" onClick={() => act(async () => { const reqs = await api.getSentRequests(me.id); const r = reqs.find((x) => x.to_user === user.id); if (r) await api.cancelFriendRequest(r.id); })}>Cancelar solicitação</button>}
      {status === "received" && (
        <>
          <button className="ork-btn ork-btn-primary ork-btn-sm" style={{ width: "auto" }} onClick={() => act(async () => { const reqs = await api.getReceivedRequests(me.id); const r = reqs.find((x) => x.from_user === user.id); if (r) { await api.respondFriendRequest(r.id, true); toast("Vocês agora são amigos!"); } })}>Aceitar</button>
          <button className="ork-btn ork-btn-ghost ork-btn-sm" onClick={() => act(async () => { const reqs = await api.getReceivedRequests(me.id); const r = reqs.find((x) => x.from_user === user.id); if (r) await api.respondFriendRequest(r.id, false); })}>Recusar</button>
        </>
      )}
      {status === "friends" && <button className="ork-btn ork-btn-ghost ork-btn-sm" onClick={() => act(() => api.removeFriendship(me.id, user.id).then(() => toast("Amizade desfeita.")))}>✓ Amigos (remover)</button>}
      {status !== "blockedByMe" && <button className="ork-btn ork-btn-ghost ork-btn-sm" onClick={() => setShowScrapBox((s) => !s)}>💬 Recado</button>}
      {status !== "blockedByMe" && <button className="ork-btn ork-btn-ghost ork-btn-sm" onClick={() => setShowTestBox((s) => !s)}>📝 Depoimento</button>}
      <button className={`ork-btn ork-btn-sm ${status === "blockedByMe" ? "ork-btn-primary" : "ork-btn-ghost"}`} style={status === "blockedByMe" ? { width: "auto" } : {}} onClick={() => act(() => status === "blockedByMe" ? api.unblockUser(me.id, user.id).then(() => toast("Usuário desbloqueado.")) : api.blockUser(me.id, user.id).then(() => toast("Usuário bloqueado.")))}>
        {status === "blockedByMe" ? "Desbloquear" : "🚫 Bloquear"}
      </button>
      <button className="ork-btn ork-btn-danger ork-btn-sm" onClick={onReport}>⚠️ Denunciar</button>

      {showScrapBox && (
        <form style={{ width: "100%", marginTop: 6, display: "flex", gap: 6 }} onSubmit={(e) => { e.preventDefault(); if (scrapText.trim()) { act(() => api.addScrap(user.id, me.id, scrapText).then(() => toast("Recado publicado!"))); setScrapText(""); setShowScrapBox(false); } }}>
          <input autoFocus value={scrapText} onChange={(e) => setScrapText(e.target.value)} placeholder={`Deixe um recado para ${user.name.split(" ")[0]}...`} style={{ flex: 1, border: "1.5px solid var(--line)", borderRadius: 20, padding: "8px 14px", fontFamily: "inherit" }} />
          <button className="ork-btn ork-btn-primary ork-btn-sm" style={{ width: "auto" }}>Enviar</button>
        </form>
      )}
      {showTestBox && (
        <form style={{ width: "100%", marginTop: 6, display: "flex", gap: 6 }} onSubmit={(e) => { e.preventDefault(); if (testText.trim()) { act(() => api.writeTestimonial(user.id, me.id, testText).then(() => toast("Depoimento enviado para aprovação!"))); setTestText(""); setShowTestBox(false); } }}>
          <input autoFocus value={testText} onChange={(e) => setTestText(e.target.value)} placeholder={`Escreva um depoimento para ${user.name.split(" ")[0]}...`} style={{ flex: 1, border: "1.5px solid var(--line)", borderRadius: 20, padding: "8px 14px", fontFamily: "inherit" }} />
          <button className="ork-btn ork-btn-primary ork-btn-sm" style={{ width: "auto" }}>Enviar</button>
        </form>
      )}
    </div>
  );
}

function EditProfileModal({ onClose, toast }) {
  const { profile: u, updateMyProfile } = useAuth();
  const [form, setForm] = useState({ ...u });
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [avatarPrev, setAvatarPrev] = useState(u.avatar_url);
  const [coverPrev, setCoverPrev] = useState(u.cover_url);
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function onAvatar(e) { const f = e.target.files[0]; if (!f) return; setAvatarFile(f); setAvatarPrev(URL.createObjectURL(f)); }
  function onCover(e) { const f = e.target.files[0]; if (!f) return; setCoverFile(f); setCoverPrev(URL.createObjectURL(f)); }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const patch = { ...form };
      delete patch.id; delete patch.email; delete patch.created_at; delete patch.updated_at; delete patch.is_admin; delete patch.is_suspended; delete patch.username;
      if (avatarFile) patch.avatar_url = await api.uploadImage("avatars", u.id, avatarFile, 320);
      if (coverFile) patch.cover_url = await api.uploadImage("covers", u.id, coverFile, 900);
      await updateMyProfile(patch);
      toast("Perfil atualizado!");
      onClose();
    } catch (err) { toast("Erro ao salvar: " + err.message, "err"); }
    finally { setSaving(false); }
  }

  const fields = [
    ["city", "Cidade"], ["state", "Estado"], ["country", "País"], ["profissao", "Profissão"],
    ["relacionamento", "Relacionamento"], ["bio", "Status/Bio curta"], ["interesses", "Interesses"],
    ["filmes", "Filmes"], ["musica", "Música"], ["livros", "Livros"], ["esportes", "Esportes"],
  ];

  return (
    <div className="ork-modal-bg" onClick={onClose}>
      <div className="ork-modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Editar perfil</h3>
        <form onSubmit={save}>
          <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
            <div>
              <div style={{ width: 70, height: 70, borderRadius: "50%", overflow: "hidden", background: "var(--lilac-50)" }}>{avatarPrev && <img src={avatarPrev} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}</div>
              <label className="link-btn" style={{ cursor: "pointer", fontSize: 12 }}>Alterar foto<input type="file" accept="image/*" style={{ display: "none" }} onChange={onAvatar} /></label>
            </div>
            <div>
              <div style={{ width: 120, height: 70, borderRadius: 10, overflow: "hidden", background: "var(--lilac-50)" }}>{coverPrev && <img src={coverPrev} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}</div>
              <label className="link-btn" style={{ cursor: "pointer", fontSize: 12 }}>Alterar capa<input type="file" accept="image/*" style={{ display: "none" }} onChange={onCover} /></label>
            </div>
          </div>
          <div className="ork-field">
            <label>Status</label>
            <select value={form.status} onChange={(e) => set("status", e.target.value)}>
              {STATUS_OPTIONS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
            </select>
          </div>
          {fields.map(([k, label]) => (
            <div className="ork-field" key={k}><label>{label}</label><input value={form[k] || ""} onChange={(e) => set(k, e.target.value)} /></div>
          ))}
          <div className="ork-field"><label>Quem sou eu</label><textarea rows={3} value={form.quem_sou_eu || ""} onChange={(e) => set("quem_sou_eu", e.target.value)} /></div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="ork-btn ork-btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="ork-btn ork-btn-primary" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
