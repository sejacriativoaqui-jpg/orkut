import { useEffect, useState, useCallback } from "react";
import * as api from "../api";
import { Avatar, EmptyState, StatBox } from "../components/Shared";
import { timeAgo } from "../helpers";

export default function AdminPage({ toast }) {
  const [tab, setTab] = useState("dashboard");
  const [counts, setCounts] = useState({ users: 0, communities: 0, posts: 0, reports: 0 });
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [reporters, setReporters] = useState({});
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, u, r, comm] = await Promise.all([api.adminCounts(), api.adminListUsers(), api.getReports(), api.listCommunities()]);
      setCounts(c); setUsers(u); setReports(r);
      setReporters(await api.getProfilesByIds([...new Set(r.map((x) => x.reporter_id).filter(Boolean))]));
      const withCounts = await Promise.all(comm.map(async (x) => ({ ...x, memberCount: (await api.getCommunityMembers(x.id)).length })));
      setCommunities(withCounts);
    } catch (e) { toast("Erro ao carregar painel: " + e.message, "err"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const novos = [...users].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);

  return (
    <>
      <div className="ork-tabsbar" style={{ background: "#fff", borderRadius: 16, padding: "4px 10px", boxShadow: "0 3px 14px rgba(80,30,120,0.06)" }}>
        {["dashboard", "usuários", "denúncias", "comunidades"].map((t) => <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>)}
      </div>
      {loading ? <div className="hint">Carregando…</div> : (
        <>
          {tab === "dashboard" && (
            <div className="card">
              <h3>Visão geral</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12 }}>
                <StatBox label="Usuários" value={counts.users} />
                <StatBox label="Comunidades" value={counts.communities} />
                <StatBox label="Posts" value={counts.posts} />
                <StatBox label="Denúncias" value={counts.reports} />
              </div>
              <h3 style={{ marginTop: 20 }}>Novos usuários</h3>
              {novos.map((u) => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                  <Avatar profile={u} size={30} /><div style={{ flex: 1, fontSize: 13.5 }}>{u.name} <span className="hint">@{u.username}</span></div>
                  <span className="hint">{timeAgo(u.created_at)}</span>
                </div>
              ))}
            </div>
          )}
          {tab === "usuários" && (
            <div className="card">
              <h3>Usuários ({users.length})</h3>
              {users.map((u) => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                  <Avatar profile={u} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{u.name} {u.is_admin && <span className="chip">admin</span>} {u.is_suspended && <span className="chip" style={{ background: "#FDEBEA", color: "#C23B31" }}>suspenso</span>}</div>
                    <div className="hint">@{u.username} · {u.email}</div>
                  </div>
                  <button className="link-btn" onClick={() => api.adminSetSuspended(u.id, !u.is_suspended).then(load)}>{u.is_suspended ? "reativar" : "suspender"}</button>
                  <button className="link-btn" onClick={() => api.adminSetAdmin(u.id, !u.is_admin).then(load)}>{u.is_admin ? "remover admin" : "tornar admin"}</button>
                </div>
              ))}
            </div>
          )}
          {tab === "denúncias" && (
            <div className="card">
              <h3>Denúncias ({reports.filter((r) => !r.resolved).length} pendentes)</h3>
              {reports.length === 0 ? <EmptyState icon="🛡️" text="Nenhuma denúncia registrada." /> : reports.map((r) => (
                <div key={r.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--line)", opacity: r.resolved ? 0.5 : 1 }}>
                  <div style={{ fontSize: 13.5 }}><strong>{r.reason}</strong> — {r.target_label}</div>
                  {r.detail && <div className="hint">{r.detail}</div>}
                  <div className="hint">por @{reporters[r.reporter_id]?.username || "?"} · {timeAgo(r.created_at)}</div>
                  {!r.resolved && <button className="link-btn" onClick={() => api.resolveReport(r.id).then(load)}>marcar como resolvida</button>}
                </div>
              ))}
            </div>
          )}
          {tab === "comunidades" && (
            <div className="card">
              <h3>Comunidades ({communities.length})</h3>
              {communities.map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                  <div className="ork-comm-thumb" style={{ width: 34, height: 34, fontSize: 14 }}>{c.image_url ? <img src={c.image_url} alt="" /> : c.name[0]}</div>
                  <div style={{ flex: 1 }}><strong style={{ fontSize: 13.5 }}>{c.name}</strong><div className="hint">{c.memberCount} membros</div></div>
                  <button className="link-btn" style={{ color: "#C23B31" }} onClick={() => { if (confirm("Excluir comunidade?")) api.deleteCommunity(c.id).then(load); }}>excluir</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
