import { useEffect, useState, useCallback } from "react";
import * as api from "../api";
import { EmptyState, PostComposer, PostCard, ReportModal } from "../components/Shared";

export default function CommunityDetailPage({ slug, me, isAdmin, go, toast }) {
  const [community, setCommunity] = useState(null);
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [likes, setLikes] = useState({});
  const [comments, setComments] = useState({});
  const [creator, setCreator] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await api.getCommunityBySlug(slug);
      setCommunity(c);
      if (!c) return;
      const [membersRows, postRows] = await Promise.all([api.getCommunityMembers(c.id), api.getCommunityPosts(c.id)]);
      setMembers(membersRows);
      setPosts(postRows);
      const ids = [...new Set([c.creator_id, ...postRows.map((p) => p.author_id)])].filter(Boolean);
      const [profilesMap, likeRows, commentRows] = await Promise.all([
        api.getProfilesByIds(ids), api.getLikes(postRows.map((p) => p.id)), api.getComments(postRows.map((p) => p.id)),
      ]);
      const extra = await api.getProfilesByIds([...new Set(commentRows.map((c2) => c2.author_id))].filter((id) => !profilesMap[id]));
      const merged = { ...profilesMap, ...extra };
      setProfiles(merged);
      setCreator(merged[c.creator_id]);
      const likeMap = {}; likeRows.forEach((l) => (likeMap[l.post_id] ||= new Set()).add(l.user_id)); setLikes(likeMap);
      const commentMap = {}; commentRows.forEach((cm) => (commentMap[cm.post_id] ||= []).push(cm)); setComments(commentMap);
    } catch (e) { toast("Erro ao carregar comunidade: " + e.message, "err"); }
    finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  if (loading && !community) return <div className="hint">Carregando…</div>;
  if (!community) return <EmptyState icon="🚫" text="Comunidade não encontrada." />;

  const isMember = members.some((m) => m.user_id === me.id);

  async function handleCreatePost({ text, file, title }) {
    let imageUrl = null;
    if (file) imageUrl = await api.uploadImage("posts", me.id, file, 700);
    await api.createPost({ authorId: me.id, text, imageUrl, communityId: community.id, title });
    toast("Publicado na comunidade!");
    load();
  }
  async function handleJoin() { await api.joinCommunity(community.id, me.id); toast("Você entrou na comunidade!"); load(); }
  async function handleLeave() { await api.leaveCommunity(community.id, me.id); load(); }
  async function handleDeleteCommunity() { if (confirm("Excluir esta comunidade?")) { await api.deleteCommunity(community.id); toast("Comunidade removida."); go("communities"); } }
  async function handleToggleLike(post) { await api.toggleLike(post.id, me.id, likes[post.id]?.has(me.id)); load(); }
  async function handleAddComment(post, text) { await api.addComment(post.id, me.id, text); load(); }
  async function handleDeletePost(post) { await api.deletePost(post.id); toast("Post excluído."); load(); }

  return (
    <>
      <div className="card">
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div className="ork-comm-thumb" style={{ width: 70, height: 70, fontSize: 24 }}>{community.image_url ? <img src={community.image_url} alt="" /> : community.name[0]}</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 style={{ margin: 0 }}>{community.name}</h2>
            <div className="hint">{members.length} membros · criada por {creator?.name || "—"}</div>
            <span className="chip chip-cat" style={{ marginTop: 6, display: "inline-block" }}>{community.category}</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {isMember ? <button className="ork-btn ork-btn-ghost ork-btn-sm" onClick={handleLeave}>Sair</button> : <button className="ork-btn ork-btn-primary ork-btn-sm" style={{ width: "auto" }} onClick={handleJoin}>Entrar</button>}
            {(isAdmin || community.creator_id === me.id) && <button className="ork-btn ork-btn-danger ork-btn-sm" onClick={handleDeleteCommunity}>Excluir</button>}
            <button className="ork-btn ork-btn-danger ork-btn-sm" onClick={() => setShowReport(true)}>⚠️</button>
          </div>
        </div>
        {community.description && <p style={{ marginTop: 10, fontSize: 13.5 }}>{community.description}</p>}
      </div>
      {isMember && <PostComposer meProfile={profiles[me.id] || me} communityMode onSubmit={handleCreatePost} placeholder="Compartilhe algo com a comunidade..." />}
      <div className="card">
        <h3>Publicações</h3>
        {posts.length === 0 ? <EmptyState icon="📭" text="Ainda não há posts nesta comunidade." /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {posts.map((p) => (
              <PostCard
                key={p.id} post={p} author={profiles[p.author_id]} meId={me.id} isAdmin={isAdmin}
                liked={!!likes[p.id]?.has(me.id)} likeCount={likes[p.id]?.size || 0}
                comments={comments[p.id] || []} commentAuthors={profiles}
                onToggleLike={handleToggleLike} onAddComment={handleAddComment} onDelete={handleDeletePost}
                onOpenProfile={(username) => go("profile", { username })}
              />
            ))}
          </div>
        )}
      </div>
      {showReport && <ReportModal targetType="comunidade" targetLabel={`a comunidade ${community.name}`} onClose={() => setShowReport(false)} onSubmit={(reason, detail) => api.addReport({ reporterId: me.id, targetType: "comunidade", targetId: community.id, targetLabel: community.name, reason, detail }).then(() => toast("Denúncia enviada."))} />}
    </>
  );
}
