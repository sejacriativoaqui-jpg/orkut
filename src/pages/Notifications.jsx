import { useEffect, useState } from "react";
import * as api from "../api";
import { Avatar, EmptyState } from "../components/Shared";
import { timeAgo, NOTIF_ICON } from "../helpers";

export default function NotificationsPage({ me, go, toast, onRead }) {
  const [list, setList] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const rows = await api.getNotifications(me.id);
        setList(rows);
        setProfiles(await api.getProfilesByIds([...new Set(rows.map((r) => r.from_user_id).filter(Boolean))]));
        if (rows.some((r) => !r.read)) { await api.markNotificationsRead(me.id); onRead(); }
      } catch (e) { toast("Erro ao carregar notificações: " + e.message, "err"); }
      finally { setLoading(false); }
    })();
    // eslint-disable-next-line
  }, [me.id]);

  return (
    <div className="card">
      <h3>Notificações</h3>
      {loading ? <div className="hint">Carregando…</div> : list.length === 0 ? <EmptyState icon="🔔" text="Nenhuma notificação por enquanto." /> : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {list.map((n) => {
            const from = profiles[n.from_user_id];
            return (
              <div key={n.id} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--line)", cursor: from ? "pointer" : "default" }} onClick={() => from && go("profile", { username: from.username })}>
                <div style={{ fontSize: 18 }}>{NOTIF_ICON[n.type] || "🔔"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5 }}>{n.text}</div>
                  <div className="hint">{timeAgo(n.created_at)}</div>
                </div>
                {!n.read && <span className="ork-status-dot" style={{ background: "var(--pink-500)", border: "none" }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
