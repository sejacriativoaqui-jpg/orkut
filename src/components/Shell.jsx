import { useState } from "react";

export default function Shell({ profile, route, unreadCount, go, signOut, children }) {
  const NAV = [
    { key: "home", label: "Início", ic: "🏠" },
    { key: "profile", label: "Meu Perfil", ic: "👤", params: { username: profile.username } },
    { key: "friends", label: "Amigos", ic: "👥" },
    { key: "communities", label: "Comunidades", ic: "🌐" },
    { key: "search", label: "Buscar", ic: "🔎" },
    { key: "notifications", label: "Notificações", ic: "🔔", badge: unreadCount },
    { key: "settings", label: "Configurações", ic: "⚙️" },
  ];
  if (profile.is_admin) NAV.push({ key: "admin", label: "Admin", ic: "🛡️" });

  const [q, setQ] = useState("");
  function doSearch(e) { e.preventDefault(); go("search", { q }); }

  return (
    <div>
      <div className="ork-header">
        <div className="brand" onClick={() => go("home")}>ork<span>ut</span></div>
        <form className="ork-search" onSubmit={doSearch}>
          <span className="ico">🔎</span>
          <input placeholder="Pesquisar pessoas e comunidades" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        <div className="ork-navicons">
          <button className={`ork-navicon ${route.page === "notifications" ? "active" : ""}`} onClick={() => go("notifications")} title="Notificações">
            🔔{unreadCount > 0 && <span className="ork-badge">{unreadCount}</span>}
          </button>
          <button className="ork-avatar-btn" onClick={() => go("profile", { username: profile.username })} title="Meu perfil">
            {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>{profile.name[0]}</div>}
          </button>
          <button className="ork-navicon" onClick={signOut} title="Sair">🚪</button>
        </div>
      </div>
      <div className="ork-body">
        <nav className="ork-sidenav">
          {NAV.map((n) => (
            <button key={n.key} className={route.page === n.key ? "active" : ""} onClick={() => go(n.key, n.params || {})}>
              <span className="ic">{n.ic}</span> {n.label} {n.badge > 0 && <span className="chip chip-cat" style={{ marginLeft: "auto" }}>{n.badge}</span>}
            </button>
          ))}
        </nav>
        <main className="ork-main">{children}</main>
      </div>
      <div className="ork-bottomnav">
        {NAV.slice(0, 5).map((n) => (
          <button key={n.key} className={route.page === n.key ? "active" : ""} onClick={() => go(n.key, n.params || {})}>
            <span className="ic">{n.ic}</span>{n.label}
            {n.badge > 0 && <span className="ork-badge" style={{ position: "absolute", top: -2, right: 6 }}>{n.badge}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
