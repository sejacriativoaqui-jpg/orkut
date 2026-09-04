import { useEffect, useState, useCallback } from "react";
import * as api from "../api";
import { Avatar, EmptyState, FriendMini } from "../components/Shared";

export default function FriendsPage({ me, go, toast }) {
  const [friends, setFriends] = useState([]);
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [friendIds, receivedReqs, sentReqs] = await Promise.all([
        api.getFriendIds(me.id), api.getReceivedRequests(me.id), api.getSentRequests(me.id),
      ]);
      const ids = [...new Set([...friendIds, ...receivedReqs.map((r) => r.from_user), ...sentReqs.map((r) => r.to_user)])];
      const profiles = await api.getProfilesByIds(ids);
      setFriends(friendIds.map((id) => profiles[id]).filter(Boolean));
      setReceived(receivedReqs.map((r) => ({ ...r, profile: profiles[r.from_user] })).filter((r) => r.profile));
      setSent(sentReqs.map((r) => ({ ...r, profile: profiles[r.to_user] })).filter((r) => r.profile));
    } catch (e) { toast("Erro ao carregar amigos: " + e.message, "err"); }
    finally { setLoading(false); }
  }, [me.id]);

  useEffect(() => { load(); }, [load]);

  const filteredFriends = friends.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()) || f.username.includes(q.toLowerCase()));

  return (
    <>
      {received.length > 0 && (
        <div className="card">
          <h3>Solicitações recebidas</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {received.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar profile={r.profile} />
                <div style={{ flex: 1 }}><strong style={{ fontSize: 13.5 }}>{r.profile.name}</strong><div className="hint">@{r.profile.username}</div></div>
                <button className="ork-btn ork-btn-primary ork-btn-sm" style={{ width: "auto" }} onClick={() => api.respondFriendRequest(r.id, true).then(() => { toast("Vocês agora são amigos!"); load(); })}>Aceitar</button>
                <button className="ork-btn ork-btn-ghost ork-btn-sm" onClick={() => api.respondFriendRequest(r.id, false).then(load)}>Recusar</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {sent.length > 0 && (
        <div className="card">
          <h3>Solicitações enviadas</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sent.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar profile={r.profile} /><div style={{ flex: 1, fontSize: 13.5 }}>{r.profile.name}</div>
                <button className="ork-btn ork-btn-ghost ork-btn-sm" onClick={() => api.cancelFriendRequest(r.id).then(load)}>Cancelar</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="card">
        <h3>Meus amigos ({friends.length})</h3>
        <input placeholder="Buscar entre seus amigos..." value={q} onChange={(e) => setQ(e.target.value)} style={{ width: "100%", border: "1.5px solid var(--line)", borderRadius: 10, padding: "8px 12px", marginBottom: 12, fontFamily: "inherit" }} />
        {loading ? <div className="hint">Carregando…</div> : filteredFriends.length === 0 ? <EmptyState icon="👥" text="Você ainda não tem amigos. Use a busca para encontrar pessoas!" /> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 4 }}>
            {filteredFriends.map((u) => <FriendMini key={u.id} profile={u} onClick={() => go("profile", { username: u.username })} />)}
          </div>
        )}
      </div>
    </>
  );
}
