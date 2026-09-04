import { useState, useEffect, useCallback } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { supabase } from "./supabaseClient";
import AuthPage from "./pages/Auth";
import CompleteProfilePage from "./pages/CompleteProfile";
import HomePage from "./pages/Home";
import ProfilePage from "./pages/Profile";
import FriendsPage from "./pages/Friends";
import CommunitiesPage from "./pages/Communities";
import CommunityDetailPage from "./pages/CommunityDetail";
import NotificationsPage from "./pages/Notifications";
import SearchPage from "./pages/Search";
import SettingsPage from "./pages/Settings";
import AdminPage from "./pages/Admin";
import Shell from "./components/Shell";

export default function App() {
  return (
    <AuthProvider>
      <div className="ork">
        <Inner />
      </div>
    </AuthProvider>
  );
}

function Inner() {
  const { session, profile, loading, signOut } = useAuth();
  const [route, setRoute] = useState({ page: "home", params: {} });
  const [toasts, setToasts] = useState([]);
  const [unread, setUnread] = useState(0);

  const toast = useCallback((text, type = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, text, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const go = useCallback((page, params = {}) => setRoute({ page, params }), []);

  const refreshUnread = useCallback(async () => {
    if (!profile) return;
    const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("recipient_id", profile.id).eq("read", false);
    setUnread(count || 0);
  }, [profile]);

  useEffect(() => { refreshUnread(); }, [refreshUnread, route.page]);

  if (loading) return <div className="ork-loading-screen">Carregando o Orkut…</div>;

  const toastHost = (
    <div className="ork-toasts">
      {toasts.map((t) => <div key={t.id} className={`ork-toast ${t.type === "err" ? "err" : ""}`}>{t.text}</div>)}
    </div>
  );

  if (!session || !profile) {
    return (<>{toastHost}<AuthPage toast={toast} /></>);
  }

  if (profile.is_suspended) {
    return (<>{toastHost}<div className="ork-landing"><div className="ork-authcard" style={{ maxWidth: 420, margin: "0 auto", textAlign: "center" }}><h2>Conta suspensa</h2><p className="sub">Sua conta foi suspensa pela administração.</p><button className="ork-btn ork-btn-ghost" onClick={signOut}>Sair</button></div></div></>);
  }

  if (!profile.profile_complete) {
    return (<>{toastHost}<CompleteProfilePage toast={toast} onDone={() => go("home")} /></>);
  }

  return (
    <>
      {toastHost}
      <Shell profile={profile} route={route} unreadCount={unread} go={go} signOut={signOut}>
        <PageRouter route={route} me={profile} isAdmin={profile.is_admin} go={go} toast={toast} onNotifRead={refreshUnread} />
      </Shell>
    </>
  );
}

function PageRouter({ route, me, isAdmin, go, toast, onNotifRead }) {
  switch (route.page) {
    case "home": return <HomePage me={me} isAdmin={isAdmin} go={go} toast={toast} />;
    case "profile": return <ProfilePage username={route.params.username || me.username} go={go} toast={toast} />;
    case "friends": return <FriendsPage me={me} go={go} toast={toast} />;
    case "communities": return <CommunitiesPage me={me} go={go} toast={toast} />;
    case "community": return <CommunityDetailPage slug={route.params.slug} me={me} isAdmin={isAdmin} go={go} toast={toast} />;
    case "notifications": return <NotificationsPage me={me} go={go} toast={toast} onRead={onNotifRead} />;
    case "search": return <SearchPage q={route.params.q || ""} me={me} go={go} toast={toast} />;
    case "settings": return <SettingsPage go={go} toast={toast} />;
    case "admin": return isAdmin ? <AdminPage toast={toast} /> : <div className="card">Acesso restrito.</div>;
    default: return <HomePage me={me} isAdmin={isAdmin} go={go} toast={toast} />;
  }
}
